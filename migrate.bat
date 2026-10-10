@echo off
set "PATH=C:\Users\Aayush\AppData\Local\Programs\nodejs;%PATH%"
echo Running CampusLoop Supabase Database Migration...
npm run migrate %*
