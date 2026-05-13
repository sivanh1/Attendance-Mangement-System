from datetime import date, timedelta
from .models import SystemSettings, Attendance, LeaveRequest, WFHRequest


def get_system_date():
    obj = SystemSettings.objects.filter(pk=1).first()
    if obj and obj.current_date >= date.today():
        return obj.current_date
    return date.today()


def has_approved_leave(user, target_date):
    return LeaveRequest.objects.filter(
        user=user,
        status='approved',
        start_date__lte=target_date,
        end_date__gte=target_date,
    ).exists()


def has_approved_wfh(user, target_date):
    return WFHRequest.objects.filter(
        user=user,
        status='approved',
        start_date__lte=target_date,
        end_date__gte=target_date,
    ).exists()


def check_leave_overlap(user, start_date, end_date, exclude_pk=None):
    leaves = LeaveRequest.objects.filter(
        user=user,
        start_date__lte=end_date,
        end_date__gte=start_date,
    ).exclude(status='rejected')
    if exclude_pk:
        leaves = leaves.exclude(pk=exclude_pk)
    if leaves.exists():
        return True

    return WFHRequest.objects.filter(
        user=user,
        start_date__lte=end_date,
        end_date__gte=start_date,
    ).exclude(status='rejected').exists()


def check_wfh_overlap(user, start_date, end_date, exclude_pk=None):
    wfhs = WFHRequest.objects.filter(
        user=user,
        start_date__lte=end_date,
        end_date__gte=start_date,
    ).exclude(status='rejected')
    if exclude_pk:
        wfhs = wfhs.exclude(pk=exclude_pk)
    if wfhs.exists():
        return True

    return LeaveRequest.objects.filter(
        user=user,
        start_date__lte=end_date,
        end_date__gte=start_date,
    ).exclude(status='rejected').exists()


def create_attendance_for_leave(leave):
    current = leave.start_date
    records = []
    while current <= leave.end_date:
        if not Attendance.objects.filter(user=leave.user, date=current).exists():
            records.append(Attendance(
                user=leave.user,
                date=current,
                status='leave',
            ))
        current += timedelta(days=1)
    if records:
        Attendance.objects.bulk_create(records, ignore_conflicts=True)


def create_attendance_for_wfh(wfh):
    current = wfh.start_date
    while current <= wfh.end_date:
        Attendance.objects.update_or_create(
            user=wfh.user,
            date=current,
            defaults={'status': 'wfh'},
        )
        current += timedelta(days=1)