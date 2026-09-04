Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
ScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
BatchPath = Chr(34) & ScriptDir & "\start_server.bat" & Chr(34)
WshShell.Run BatchPath, 0, False
