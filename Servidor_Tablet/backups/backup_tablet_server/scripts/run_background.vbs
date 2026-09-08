' ============================================================
' SimpleFarm Integration — Lancador Silencioso (sem janela)
' Duplo clique para iniciar ambos os servidores invisivel.
' ============================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Descobre a pasta raiz do projeto (pasta pai de /scripts)
ScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
ProjectDir = fso.GetParentFolderName(ScriptDir)
BatchPath = Chr(34) & ScriptDir & "\start_server.bat" & Chr(34)

' Inicia o bat completamente invisivel (0 = oculto, False = nao aguarda)
WshShell.Run BatchPath, 0, False

' Exibe mensagem de confirmacao discreta
WScript.Sleep 2000
MsgBox "SimpleFarm Integration iniciado!" & vbCrLf & vbCrLf & _
       "O servidor esta rodando em segundo plano." & vbCrLf & _
       "Acesse pelo tablet via Wi-Fi.", _
       vbInformation, "SimpleFarm — Servidor Ativo"
