from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import date

from .models import Attendance, LeaveRequest, WFHRequest, SystemSettings
from .serializers import (
    AttendanceSerializer, LeaveRequestSerializer,
    WFHRequestSerializer, UserSerializer, SystemSettingsSerializer,
)
from .services import (
    get_system_date, has_approved_leave, has_approved_wfh,
    check_leave_overlap, check_wfh_overlap,
    create_attendance_for_leave, create_attendance_for_wfh,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        password2 = request.data.get('password2', '')

        if not username or not password:
            return Response({'error': 'Username and password required.'}, status=400)
        if password != password2:
            return Response({'error': 'Passwords do not match.'}, status=400)
        if len(password) < 6:
            return Response({'error': 'Password must be at least 6 characters.'}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already taken.'}, status=400)

        user = User.objects.create_user(username=username, password=password)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=201)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({'error': 'Invalid username or password.'}, status=401)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = get_system_date()

        attendance_today = Attendance.objects.filter(
            user=request.user, date=today
        ).select_related('user').first()

        leave_requests = LeaveRequest.objects.filter(
            user=request.user
        ).select_related('user', 'actioned_by').order_by('-created_at')

        wfh_requests = WFHRequest.objects.filter(
            user=request.user
        ).select_related('user', 'actioned_by').order_by('-created_at')

        attendance_records = Attendance.objects.filter(
            user=request.user
        ).select_related('user').order_by('-date')

        return Response({
            'today': str(today),
            'attendance_today': AttendanceSerializer(attendance_today).data if attendance_today else None,
            'leave_requests': LeaveRequestSerializer(leave_requests, many=True).data,
            'wfh_requests': WFHRequestSerializer(wfh_requests, many=True).data,
            'attendance_records': AttendanceSerializer(attendance_records, many=True).data,
            'has_approved_leave_today': has_approved_leave(request.user, today),
            'has_approved_wfh_today': has_approved_wfh(request.user, today),
        })


class MarkAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.is_staff:
            return Response({'error': 'Admins cannot mark attendance.'}, status=403)

        today = get_system_date()

        if Attendance.objects.filter(user=request.user, date=today).exists():
            return Response({'error': 'Attendance already marked for today.'}, status=400)

        if has_approved_leave(request.user, today):
            return Response({'error': 'You have an approved leave for today.'}, status=400)

        if has_approved_wfh(request.user, today):
            status_val = 'wfh'
        else:
            status_val = request.data.get('status')
            if status_val not in ['present', 'wfh']:
                return Response({'error': 'Invalid status.'}, status=400)

        att = Attendance.objects.create(
            user=request.user,
            date=today,
            status=status_val,
        )
        label = {'present': 'Present', 'wfh': 'Work From Home'}.get(status_val, status_val)
        return Response({
            'message': f'Marked as {label}.',
            'attendance': AttendanceSerializer(att).data,
        })


class SubmitLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.is_staff:
            return Response({'error': 'Admins cannot submit leave.'}, status=403)

        today = get_system_date()
        try:
            start = date.fromisoformat(request.data.get('start_date', ''))
            end = date.fromisoformat(request.data.get('end_date', ''))
        except ValueError:
            return Response({'error': 'Invalid dates.'}, status=400)

        if end < start:
            return Response({'error': 'End date cannot be before start date.'}, status=400)
        if start < today:
            return Response({'error': 'Start date cannot be in the past.'}, status=400)

        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'error': 'Reason is required.'}, status=400)

        if check_leave_overlap(request.user, start, end):
            return Response({'error': 'Leave or WFH request already exists for these dates.'}, status=400)

        leave = LeaveRequest.objects.create(
            user=request.user,
            start_date=start,
            end_date=end,
            reason=reason,
        )
        return Response({
            'message': f'Leave submitted for {leave.num_days} day(s).',
            'leave': LeaveRequestSerializer(leave).data,
        }, status=201)


class SubmitWFHView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.is_staff:
            return Response({'error': 'Admins cannot submit WFH.'}, status=403)

        today = get_system_date()
        try:
            start = date.fromisoformat(request.data.get('start_date', ''))
            end = date.fromisoformat(request.data.get('end_date', ''))
        except ValueError:
            return Response({'error': 'Invalid dates.'}, status=400)

        if end < start:
            return Response({'error': 'End date cannot be before start date.'}, status=400)
        if start < today:
            return Response({'error': 'Start date cannot be in the past.'}, status=400)

        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'error': 'Reason is required.'}, status=400)

        if check_wfh_overlap(request.user, start, end):
            return Response({'error': 'WFH or leave request already exists for these dates.'}, status=400)

        wfh = WFHRequest.objects.create(
            user=request.user,
            start_date=start,
            end_date=end,
            reason=reason,
        )
        return Response({
            'message': f'WFH submitted for {wfh.num_days} day(s).',
            'wfh': WFHRequestSerializer(wfh).data,
        }, status=201)


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Forbidden.'}, status=403)

        today = get_system_date()
        today_att = Attendance.objects.filter(date=today).select_related('user')
        all_att = Attendance.objects.all().select_related('user').order_by('-date')

        return Response({
            'today': str(today),
            'today_attendance': AttendanceSerializer(today_att, many=True).data,
            'today_present': today_att.filter(status='present').count(),
            'today_wfh': today_att.filter(status='wfh').count(),
            'today_leave': today_att.filter(status='leave').count(),
            'today_total': today_att.count(),
            'all_attendance': AttendanceSerializer(all_att, many=True).data,  # 👈 added
            'pending_leaves': LeaveRequestSerializer(
                LeaveRequest.objects.filter(status='pending').order_by('-created_at'),
                many=True
            ).data,
            'done_leaves': LeaveRequestSerializer(
                LeaveRequest.objects.exclude(status='pending').order_by('-actioned_at'),
                many=True
            ).data,
            'pending_wfh': WFHRequestSerializer(
                WFHRequest.objects.filter(status='pending').order_by('-created_at'),
                many=True
            ).data,
            'done_wfh': WFHRequestSerializer(
                WFHRequest.objects.exclude(status='pending').order_by('-actioned_at'),
                many=True
            ).data,
        })


class ActionLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, action):
        if not request.user.is_staff:
            return Response({'error': 'Forbidden.'}, status=403)
        if action not in ['approved', 'rejected']:
            return Response({'error': 'Invalid action.'}, status=400)

        try:
            leave = LeaveRequest.objects.select_related('user').get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        leave.status = action
        leave.actioned_by = request.user
        leave.actioned_at = timezone.now()
        leave.save()

        if action == 'approved':
            create_attendance_for_leave(leave)

        return Response({
            'message': f'Leave {action}.',
            'leave': LeaveRequestSerializer(leave).data,
        })


class ActionWFHView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, action):
        if not request.user.is_staff:
            return Response({'error': 'Forbidden.'}, status=403)
        if action not in ['approved', 'rejected']:
            return Response({'error': 'Invalid action.'}, status=400)

        try:
            wfh = WFHRequest.objects.select_related('user').get(pk=pk)
        except WFHRequest.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        wfh.status = action
        wfh.actioned_by = request.user
        wfh.actioned_at = timezone.now()
        wfh.save()

        if action == 'approved':
            create_attendance_for_wfh(wfh)

        return Response({
            'message': f'WFH {action}.',
            'wfh': WFHRequestSerializer(wfh).data,
        })


class SystemDateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Forbidden.'}, status=403)
        return Response({'current_date': str(get_system_date())})

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Forbidden.'}, status=403)

        if request.data.get('reset_today'):
            new_date = date.today()
        else:
            try:
                new_date = date.fromisoformat(request.data.get('current_date', ''))
            except ValueError:
                return Response({'error': 'Invalid date.'}, status=400)

        obj, _ = SystemSettings.objects.get_or_create(pk=1)
        obj.current_date = new_date
        obj.save()
        return Response({
            'message': f'System date updated to {new_date}.',
            'current_date': str(new_date),
        })


class AdminAllAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Forbidden.'}, status=403)

        qs = Attendance.objects.all().select_related('user').order_by('-date')
        date_filter = request.query_params.get('date')
        if date_filter:
            qs = qs.filter(date=date_filter)
        return Response(AttendanceSerializer(qs[:200], many=True).data)