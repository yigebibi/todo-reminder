#Requires -Version 5.1
<#
.SYNOPSIS
  Register Todo Reminder's AUMID with Windows by creating a Start Menu .lnk
  whose System.AppUserModel.ID property equals our AUMID.

.DESCRIPTION
  Windows toast notifications attribute the toast to the AUMID-registered app.
  `SetCurrentProcessExplicitAppUserModelID` alone is NOT enough — Windows also
  requires a Start Menu shortcut carrying the AUMID in its IPropertyStore,
  otherwise tauri-winrt-notification falls back to PowerShell's AUMID and the
  toast header shows "Windows PowerShell".

  Release installers (MSI/NSIS) generate this shortcut automatically.
  This script is only needed during dev.
#>

param(
  [string]$ExePath = 'D:\projects\todo-reminder\src-tauri\target\debug\todo-reminder.exe',
  [string]$Aumid   = 'com.lenvovo.todoreminder',
  [string]$DisplayName = 'Todo Reminder'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ExePath)) {
  throw "Target exe not found: $ExePath. Build first: pnpm tauri build --debug"
}

$startMenuDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$lnkPath      = Join-Path $startMenuDir "$DisplayName.lnk"

Write-Host "[1/3] Creating shortcut at: $lnkPath"
$shell                  = New-Object -ComObject WScript.Shell
$shortcut               = $shell.CreateShortcut($lnkPath)
$shortcut.TargetPath    = $ExePath
$shortcut.WorkingDirectory = Split-Path $ExePath
$shortcut.IconLocation  = "$ExePath,0"
$shortcut.Description   = $DisplayName
$shortcut.Save()

Write-Host "[2/3] Loading IPropertyStore bindings..."

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

namespace TodoReminder.AumidReg {

  [StructLayout(LayoutKind.Sequential, Pack = 4)]
  public struct PROPERTYKEY {
    public Guid fmtid;
    public uint pid;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct PROPVARIANT {
    public ushort vt;
    public ushort wReserved1;
    public ushort wReserved2;
    public ushort wReserved3;
    public IntPtr data1;
    public IntPtr data2;
  }

  [ComImport,
   Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"),
   InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IPropertyStore {
    [PreserveSig] int GetCount(out uint cProps);
    [PreserveSig] int GetAt(uint iProp, out PROPERTYKEY pkey);
    [PreserveSig] int GetValue(ref PROPERTYKEY key, out PROPVARIANT pv);
    [PreserveSig] int SetValue(ref PROPERTYKEY key, ref PROPVARIANT pv);
    [PreserveSig] int Commit();
  }

  internal static class NativeMethods {
    [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    internal static extern void SHGetPropertyStoreFromParsingName(
      [MarshalAs(UnmanagedType.LPWStr)] string pszPath,
      IntPtr pbc,
      int flags,
      ref Guid riid,
      [MarshalAs(UnmanagedType.Interface)] out IPropertyStore propertyStore);

    [DllImport("ole32.dll")]
    internal static extern int PropVariantClear(ref PROPVARIANT pvar);
  }

  // Facade so PowerShell never has to deal with out-interface marshaling.
  public static class Aumid {

    private static readonly Guid SystemAppUserModelID_FmtId =
      new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3");
    private const uint SystemAppUserModelID_Pid = 5;

    private const ushort VT_LPWSTR = 31;

    public static void BindToShortcut(string lnkPath, string aumid) {
      // GETPROPERTYSTOREFLAGS.GPS_READWRITE = 0x2
      Guid iid = typeof(IPropertyStore).GUID;
      IPropertyStore store;
      NativeMethods.SHGetPropertyStoreFromParsingName(
        lnkPath, IntPtr.Zero, 0x2, ref iid, out store);
      if (store == null) throw new InvalidOperationException("SHGetPropertyStoreFromParsingName returned null store.");

      // Build a VT_LPWSTR PROPVARIANT manually. The string must be allocated with
      // CoTaskMemAlloc (Marshal.StringToCoTaskMemUni), so PropVariantClear will
      // free it via CoTaskMemFree.
      PROPVARIANT pv = new PROPVARIANT();
      pv.vt = VT_LPWSTR;
      pv.data1 = Marshal.StringToCoTaskMemUni(aumid);

      try {
        PROPERTYKEY pk = new PROPERTYKEY {
          fmtid = SystemAppUserModelID_FmtId,
          pid = SystemAppUserModelID_Pid
        };
        int hr = store.SetValue(ref pk, ref pv);
        if (hr < 0) throw Marshal.GetExceptionForHR(hr);
        hr = store.Commit();
        if (hr < 0) throw Marshal.GetExceptionForHR(hr);
      }
      finally {
        NativeMethods.PropVariantClear(ref pv);
        Marshal.ReleaseComObject(store);
      }
    }
  }
}
'@

Write-Host "[3/3] Writing AppUserModelID = $Aumid into $lnkPath"

[TodoReminder.AumidReg.Aumid]::BindToShortcut($lnkPath, $Aumid)

Write-Host ""
Write-Host "Done. AUMID '$Aumid' bound to shortcut:" -ForegroundColor Green
Write-Host "  $lnkPath"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Fully close the running todo-reminder app (tray + process)"
Write-Host "  2. Re-run ``pnpm tauri dev`` so the new process starts fresh"
Write-Host "  3. Trigger a reminder — the toast header should now read 'Todo Reminder'"
