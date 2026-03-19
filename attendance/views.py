from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from datetime import date, datetime
from .models import SystemSettings, Attendance, LeaveRequest, WFHRequest


def get_system_date():
    s = SystemSettings.objects.first()
    return s.current_date if s else date.today()


def is_admin(user):
    return user.is_staff or user.is_superuser


def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect('dashboard')
        messages.error(request, 'Invalid username or password.')
    return render(request, 'attendance/login.html')


def logout_view(request):
    logout(request)
    return redirect('login')


def register_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        password2 = request.POST.get('password2', '')
        if not username or not password:
            messages.error(request, 'Username and password are required.')
        elif password != password2:
            messages.error(request, 'Passwords do not match.')
        elif User.objects.filter(username=username).exists():
            messages.error(request, 'Username already taken.')
        else:
            User.objects.create_user(username=username, password=password)
            messages.success(request, 'Account created! Please log in.')
            return redirect('login')
    return render(request, 'attendance/register.html')


@login_required
def dashboard(request):
    if is_admin(request.user):
        return redirect('admin_dashboard')
    return redirect('user_dashboard')


@login_required
def user_dashboard(request):
    if is_admin(request.user):
        return redirect('admin_dashboard')
    system_date = get_system_date()
    attendance_today = Attendance.objects.filter(user=request.user, date=system_date).first()
    leave_today = LeaveRequest.objects.filter(
        user=request.user,
        start_date__lte=system_date,
        end_date__gte=system_date,
        status='approved',
    ).first()
    wfh_approved_today = WFHRequest.objects.filter(
        user=request.user,
        start_date__lte=system_date,
        end_date__gte=system_date,
        status='approved',
    ).exists()
    leave_requests = LeaveRequest.objects.filter(user=request.user).order_by('-created_at')
    wfh_requests = WFHRequest.objects.filter(user=request.user).order_by('-created_at')
    attendance_records = Attendance.objects.filter(user=request.user).order_by('date')
    return render(request, 'attendance/user_dashboard.html', {
        'system_date': system_date,
        'attendance_today': attendance_today,
        'leave_today': leave_today,
        'wfh_approved_today': wfh_approved_today,
        'leave_requests': leave_requests,
        'wfh_requests': wfh_requests,
        'attendance_records': attendance_records,
    })


@login_required
def mark_attendance(request):
    if is_admin(request.user) or request.method != 'POST':
        return redirect('dashboard')
    system_date = get_system_date()
    if Attendance.objects.filter(user=request.user, date=system_date).exists():
        messages.error(request, 'Attendance already marked for today.')
        return redirect('user_dashboard')
    if LeaveRequest.objects.filter(
        user=request.user,
        start_date__lte=system_date,
        end_date__gte=system_date,
        status='approved',
    ).exists():
        messages.error(request, 'You have an approved leave today. Cannot mark attendance.')
        return redirect('user_dashboard')
    status = request.POST.get('status')
    if WFHRequest.objects.filter(
        user=request.user,
        start_date__lte=system_date,
        end_date__gte=system_date,
        status='approved',
    ).exists():
        status = 'wfh'
    if status not in ['present', 'wfh']:
        messages.error(request, 'Invalid status.')
        return redirect('user_dashboard')
    # Use datetime.now() to capture the real local system time
    Attendance.objects.create(
        user=request.user,
        date=system_date,
        status=status,
        marked_at=datetime.now(),
    )
    label = 'Present' if status == 'present' else 'Work From Home'
    messages.success(request, f'Attendance marked as {label}.')
    return redirect('user_dashboard')


def _parse_date_range(post, system_date):
    try:
        start = date.fromisoformat(post.get('start_date', ''))
        end = date.fromisoformat(post.get('end_date', ''))
    except ValueError:
        raise ValueError('Invalid date(s). Please use the date picker.')
    if end < start:
        raise ValueError('End date cannot be before start date.')
    if start < system_date:
        raise ValueError('Start date cannot be in the past.')
    return start, end


@login_required
def submit_leave(request):
    if is_admin(request.user) or request.method != 'POST':
        return redirect('dashboard')
    system_date = get_system_date()
    try:
        start_date, end_date = _parse_date_range(request.POST, system_date)
    except ValueError as e:
        messages.error(request, str(e))
        return redirect('user_dashboard')
    if LeaveRequest.objects.filter(user=request.user, start_date__lte=end_date, end_date__gte=start_date).exists():
        messages.error(request, 'A leave request already exists for the selected dates.')
        return redirect('user_dashboard')
    if WFHRequest.objects.filter(user=request.user, start_date__lte=end_date, end_date__gte=start_date).exists():
        messages.error(request, 'A WFH request already exists that overlaps with the selected dates.')
        return redirect('user_dashboard')
    LeaveRequest.objects.create(
        user=request.user,
        start_date=start_date,
        end_date=end_date,
        reason=request.POST.get('reason', ''),
    )
    num_days = (end_date - start_date).days + 1
    messages.success(request, f'Leave request submitted for {num_days} day(s): {start_date} to {end_date}.')
    return redirect('user_dashboard')


@login_required
def submit_wfh(request):
    if is_admin(request.user) or request.method != 'POST':
        return redirect('dashboard')
    system_date = get_system_date()
    try:
        start_date, end_date = _parse_date_range(request.POST, system_date)
    except ValueError as e:
        messages.error(request, str(e))
        return redirect('user_dashboard')
    if WFHRequest.objects.filter(user=request.user, start_date__lte=end_date, end_date__gte=start_date).exists():
        messages.error(request, 'A WFH request already exists that overlaps with the selected dates.')
        return redirect('user_dashboard')
    if LeaveRequest.objects.filter(user=request.user, start_date__lte=end_date, end_date__gte=start_date).exists():
        messages.error(request, 'A leave request already exists that overlaps with the selected dates.')
        return redirect('user_dashboard')
    WFHRequest.objects.create(
        user=request.user,
        start_date=start_date,
        end_date=end_date,
        reason=request.POST.get('reason', ''),
    )
    num_days = (end_date - start_date).days + 1
    messages.success(request, f'WFH request submitted for {num_days} day(s): {start_date} to {end_date}.')
    return redirect('user_dashboard')


@login_required
def admin_dashboard(request):
    if not is_admin(request.user):
        return redirect('user_dashboard')
    system_date = get_system_date()
    today_attendance = (
        Attendance.objects.filter(date=system_date)
        .select_related('user')
        .order_by('user__username')
    )
    return render(request, 'attendance/admin_dashboard.html', {
        'system_date': system_date,
        'pending_leaves': LeaveRequest.objects.filter(status='pending').order_by('-created_at'),
        'pending_wfh': WFHRequest.objects.filter(status='pending').order_by('-created_at'),
        'done_leaves': LeaveRequest.objects.exclude(status='pending').order_by('-actioned_at'),
        'done_wfh': WFHRequest.objects.exclude(status='pending').order_by('-actioned_at'),
        'today_attendance': today_attendance,
        'today_present_count': today_attendance.filter(status='present').count(),
        'today_wfh_count': today_attendance.filter(status='wfh').count(),
        'today_leave_count': today_attendance.filter(status='leave').count(),
        'today_total': today_attendance.count(),
    })


@login_required
def action_leave(request, pk, action):
    if not is_admin(request.user) or action not in ['approved', 'rejected']:
        return redirect('dashboard')
    leave = get_object_or_404(LeaveRequest, pk=pk)
    leave.status = action
    leave.actioned_by = request.user
    leave.actioned_at = datetime.now()
    leave.save()
    if action == 'approved':
        for d in leave.date_range():
            Attendance.objects.get_or_create(user=leave.user, date=d, defaults={'status': 'leave'})
    messages.success(request, f'Leave request {action}.')
    return redirect('admin_dashboard')


@login_required
def action_wfh(request, pk, action):
    if not is_admin(request.user) or action not in ['approved', 'rejected']:
        return redirect('dashboard')
    wfh = get_object_or_404(WFHRequest, pk=pk)
    wfh.status = action
    wfh.actioned_by = request.user
    wfh.actioned_at = datetime.now()
    wfh.save()
    messages.success(request, f'WFH request {action}.')
    return redirect('admin_dashboard')


@login_required
def system_settings(request):
    if not is_admin(request.user):
        return redirect('user_dashboard')
    settings = SystemSettings.objects.first()
    if request.method == 'POST':
        if 'reset_today' in request.POST:
            today = date.today()
            if settings:
                settings.current_date = today
                settings.save()
            else:
                SystemSettings.objects.create(current_date=today)
            messages.success(request, f'System date reset to today ({today}).')
            return redirect('system_settings')
        try:
            new_date = date.fromisoformat(request.POST.get('current_date', ''))
            if settings:
                settings.current_date = new_date
                settings.save()
            else:
                SystemSettings.objects.create(current_date=new_date)
            messages.success(request, f'System date updated to {new_date}.')
        except ValueError:
            messages.error(request, 'Invalid date.')
        return redirect('system_settings')
    return render(request, 'attendance/system_settings.html', {
        'system_date': get_system_date(),
        'settings': settings,
    })