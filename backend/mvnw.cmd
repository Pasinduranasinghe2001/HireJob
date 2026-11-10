@echo off
@setlocal

set "JAVA_EXE=java.exe"
if defined JAVA_HOME (
  set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
)

set "DIRNAME=%~dp0"
if "%DIRNAME%" == "" set "DIRNAME=."
set "MAVEN_BASEDIR=%DIRNAME%"
if "%MAVEN_BASEDIR:~-1%"=="\" set "MAVEN_BASEDIR=%MAVEN_BASEDIR:~0,-1%"

set "WRAPPER_JAR=%MAVEN_BASEDIR%\.mvn\wrapper\maven-wrapper.jar"

if not exist "%WRAPPER_JAR%" (
  echo Error: Could not find %WRAPPER_JAR%
  exit /b 1
)

"%JAVA_EXE%" -Dmaven.multiModuleProjectDirectory="%MAVEN_BASEDIR%" %MAVEN_OPTS% -classpath "%WRAPPER_JAR%" org.apache.maven.wrapper.MavenWrapperMain %*

exit /b %ERRORLEVEL%
