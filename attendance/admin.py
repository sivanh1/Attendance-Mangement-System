from django.contrib import admin
from .models import SystemSettings, Attendance, LeaveRequest, WFHRequest

admin.site.register(SystemSettings)
admin.site.register(Attendance)
admin.site.register(LeaveRequest)
admin.site.register(WFHRequest)
