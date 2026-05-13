from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from attendance import views as v

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/register/', v.RegisterView.as_view()),
    path('api/auth/login/', v.LoginView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/dashboard/', v.DashboardView.as_view()),
    path('api/mark-attendance/', v.MarkAttendanceView.as_view()),
    path('api/submit-leave/', v.SubmitLeaveView.as_view()),
    path('api/submit-wfh/', v.SubmitWFHView.as_view()),
    path('api/admin/dashboard/', v.AdminDashboardView.as_view()),
    path('api/admin/leave/<int:pk>/<str:action>/', v.ActionLeaveView.as_view()),
    path('api/admin/wfh/<int:pk>/<str:action>/', v.ActionWFHView.as_view()),
    path('api/admin/system-date/', v.SystemDateView.as_view()),
    path('api/admin/all-attendance/', v.AdminAllAttendanceView.as_view()),
]