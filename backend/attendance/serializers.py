from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Attendance, LeaveRequest, WFHRequest, SystemSettings


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'is_staff']
class AttendanceSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    marked_at_str = serializers.SerializerMethodField()

    def get_marked_at_str(self, obj):
        return obj.marked_at.strftime('%I:%M %p') if obj.marked_at else None

    class Meta:
        model = Attendance
        fields = ['id', 'username', 'date', 'status', 'marked_at_str']


class LeaveRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    num_days = serializers.IntegerField(read_only=True)
    actioned_by_username = serializers.CharField(
        source='actioned_by.username', read_only=True, default=None
    )

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'username', 'start_date', 'end_date', 'reason',
            'status', 'num_days', 'created_at',
            'actioned_by_username', 'actioned_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'actioned_by_username', 'actioned_at']

    def validate(self, data):
        from .services import get_system_date, check_leave_overlap

        start = data.get('start_date')
        end = data.get('end_date')
        user = self.context['request'].user

        if not start or not end:
            raise serializers.ValidationError('Start and end dates are required.')
        if end < start:
            raise serializers.ValidationError('End date cannot be before start date.')
        if start < get_system_date():
            raise serializers.ValidationError('Start date cannot be in the past.')

        exclude_pk = self.instance.pk if self.instance else None
        if check_leave_overlap(user, start, end, exclude_pk=exclude_pk):
            raise serializers.ValidationError(
                'Leave overlaps with an existing leave or WFH request.'
            )
        return data


class WFHRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    num_days = serializers.IntegerField(read_only=True)
    actioned_by_username = serializers.CharField(
        source='actioned_by.username', read_only=True, default=None
    )

    class Meta:
        model = WFHRequest
        fields = [
            'id', 'username', 'start_date', 'end_date', 'reason',
            'status', 'num_days', 'created_at',
            'actioned_by_username', 'actioned_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'actioned_by_username', 'actioned_at']

    def validate(self, data):
        from .services import get_system_date, check_wfh_overlap

        start = data.get('start_date')
        end = data.get('end_date')
        user = self.context['request'].user

        if not start or not end:
            raise serializers.ValidationError('Start and end dates are required.')
        if end < start:
            raise serializers.ValidationError('End date cannot be before start date.')
        if start < get_system_date():
            raise serializers.ValidationError('WFH date cannot be in the past.')

        exclude_pk = self.instance.pk if self.instance else None
        if check_wfh_overlap(user, start, end, exclude_pk=exclude_pk):
            raise serializers.ValidationError(
                'WFH overlaps with an existing leave or WFH request.'
            )
        return data


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = ['current_date']