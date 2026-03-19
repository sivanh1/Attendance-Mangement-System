
import os, subprocess, sys

def run(cmd):
    print(f"\n>>> {cmd}")
    subprocess.run(cmd, shell=True, check=True)

run(f"{sys.executable} manage.py makemigrations attendance")
run(f"{sys.executable} manage.py migrate")
print("\n Setup complete! Now create a superuser:")
run(f"{sys.executable} manage.py createsuperuser")
