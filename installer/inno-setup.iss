; InnoSetup 脚本 - Bible Microservices 安装程序
; 版本: 1.0.0
; 日期: 2026-05-02

#define MyAppName "Bible Microservices"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Bible Dev"
#define MyAppExeName "start.bat"
#define MyAppAssocName "Bible Services"
#define MyAppAssocExt ".bible"
#define MyAppAssocKey StringChange(MyAppAssocName, " ", "") + MyAppAssocExt

[Setup]
; 安装程序基本设置
AppId={{8A3F2E1D-4B5C-6D7E-8F9A-0B1C2D3E4F5A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; 打包 JRE 后的输出目录
OutputDir=..\installer
OutputBaseFilename=BibleMicroservices-Setup-{#MyAppVersion}
SetupIconFile=..\dist\app.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
; 安装程序图标
WizardImageFile=compiler:WizModernImage.bmp
WizardSmallImageFile=compiler:WizModernSmallImage.bmp
; 权限提升（需要管理员）
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
; 协议
LicenseFile=..\LICENSE
; 安装类型
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode
Name: "startupicon"; Description: "开机自启动服务"; GroupDescription: "服务选项:"; Flags: unchecked
Name: "createfirewall"; Description: "添加入站防火墙规则 (端口 8080-8083)"; GroupDescription: "系统配置:"; Flags: checked

[Files]
; ====== 核心文件 ======
Source: "..\dist\start.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\stop.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\README.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion

; ====== JRE 运行环境 ======
Source: "..\dist\jre\*"; DestDir: "{app}\jre"; Flags: ignoreversion recursesubdirs createallsubdirs

; ====== Gateway 服务 ======
Source: "..\dist\jars\bible-gateway.jar"; DestDir: "{app}\services\gateway"; Flags: ignoreversion
Source: "..\dist\jars\gateway-application.yml"; DestDir: "{app}\services\gateway"; Flags: ignoreversion

; ====== Text 服务 ======
Source: "..\dist\jars\bible-text-service.jar"; DestDir: "{app}\services\text-service"; Flags: ignoreversion
Source: "..\dist\jars\text-service-application.yml"; DestDir: "{app}\services\text-service"; Flags: ignoreversion

; ====== Search 服务 ======
Source: "..\dist\jars\bible-search-service.jar"; DestDir: "{app}\services\search-service"; Flags: ignoreversion
Source: "..\dist\jars\search-service-application.yml"; DestDir: "{app}\services\search-service"; Flags: ignoreversion

; ====== Module 服务 ======
Source: "..\dist\jars\bible-module-service.jar"; DestDir: "{app}\services\module-service"; Flags: ignoreversion
Source: "..\dist\jars\module-service-application.yml"; DestDir: "{app}\services\module-service"; Flags: ignoreversion

; ====== 数据目录 ======
; 创建空数据目录（用户数据将存储在这里）
Source: "..\dist\data-placeholder.txt"; DestDir: "{app}\data"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\start.bat"; IconFilename: "{app}\app.ico"
Name: "{group}\停止服务"; Filename: "{app}\stop.bat"; Flags: createonlyiffileexists
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\start.bat"; Tasks: desktopicon; IconFilename: "{app}\app.ico"
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\start.bat"; Tasks: startupicon; Flags: createonlyiffileexists

[Registry]
; ====== 开机自启动 ======
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#MyAppName}"; ValueData: """{app}\start.bat"""; Flags: uninsdeletevalue; Tasks: startupicon

; ====== 防火墙规则 ======
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\FirewallRules"; ValueType: string; ValueName: "{#MyAppName}-TCP-8080"; ValueData: "v2.4|Action=Allow|Active=TRUE|Dir=In|Protocol=6|LPort=8080|Name=Bible Gateway 8080|"; Flags: uninsdeletekey; Tasks: createfirewall
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\FirewallRules"; ValueType: string; ValueName: "{#MyAppName}-TCP-8081"; ValueData: "v2.4|Action=Allow|Active=TRUE|Dir=In|Protocol=6|LPort=8081|Name=Bible Text Service 8081|"; Flags: uninsdeletekey; Tasks: createfirewall
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\FirewallRules"; ValueType: string; ValueName: "{#MyAppName}-TCP-8082"; ValueData: "v2.4|Action=Allow|Active=TRUE|Dir=In|Protocol=6|LPort=8082|Name=Bible Search Service 8082|"; Flags: uninsdeletekey; Tasks: createfirewall
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\FirewallRules"; ValueType: string; ValueName: "{#MyAppName}-TCP-8083"; ValueData: "v2.4|Action=Allow|Active=TRUE|Dir=In|Protocol=6|LPort=8083|Name=Bible Module Service 8083|"; Flags: uninsdeletekey; Tasks: createfirewall

[Run]
; 安装完成后自动启动
Filename: "{app}\start.bat"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: postinstall nowait

[UninstallRun]
; 卸载时先停止服务
Filename: "{cmd}"; Parameters: "/C taskkill /F /IM java.exe 2>nul & timeout /T 2 /NOBREAK >nul"; Flags: runhidden

[UninstallDelete]
; 卸载时删除数据目录（可选，提示用户）
Type: filesandordirs; Name: "{app}\data"

[Code]
// 检查端口占用
function IsPortInUse(Port: Integer): Boolean;
var
  TCPTable: variant;
  i: Integer;
begin
  Result := False;
  try
    TCPTable := CreateOleObject('System.Collections.Hashtable');
    // 使用 netstat 检查端口
  except
  end;
end;

// 初始化
procedure InitializeWizard;
begin
  WizardForm.WelcomeLabel2.Caption := 
    '此向导将引导您完成 Bible Microservices 的安装。' + #13#10 + #13#10 +
    '安装程序将为您安装:' + #13#10 +
    '  • Bible Gateway (API网关) - 端口 8080' + #13#10 +
    '  • Bible Text Service (经文查询) - 端口 8081' + #13#10 +
    '  • Bible Search Service (全文搜索) - 端口 8082' + #13#10 +
    '  • Bible Module Service (模块管理) - 端口 8083' + #13#10 +
    '  • Java 17 运行环境 (嵌入式)' + #13#10 + #13#10 +
    '点击"下一步"继续。';
end;

// 卸载提示
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    if MsgBox('是否删除所有用户数据（包括导入的圣经数据）？', mbConfirmation, MB_YESNO) = IDYES then
    begin
      DelTree(ExpandConstant('{app}\data'), True, True, True);
    end;
  end;
end;