#Requires -Version 5.1
# Read back System.AppUserModel.ID from the Start Menu shortcut to confirm binding.

param(
  [string]$LnkPath = (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Todo Reminder.lnk')
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

namespace TodoReminder.AumidVerify {

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

  [ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"),
   InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IPropertyStore {
    [PreserveSig] int GetCount(out uint cProps);
    [PreserveSig] int GetAt(uint iProp, out PROPERTYKEY pkey);
    [PreserveSig] int GetValue(ref PROPERTYKEY key, out PROPVARIANT pv);
    [PreserveSig] int SetValue(ref PROPERTYKEY key, ref PROPVARIANT pv);
    [PreserveSig] int Commit();
  }

  internal static class Native {
    [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    internal static extern void SHGetPropertyStoreFromParsingName(
      string pszPath, IntPtr pbc, int flags, ref Guid riid,
      [MarshalAs(UnmanagedType.Interface)] out IPropertyStore store);

    [DllImport("ole32.dll")]
    internal static extern int PropVariantClear(ref PROPVARIANT pvar);
  }

  public static class Reader {
    public static string ReadAumid(string lnk) {
      Guid iid = typeof(IPropertyStore).GUID;
      IPropertyStore store;
      // GPS_READ = 0
      Native.SHGetPropertyStoreFromParsingName(lnk, IntPtr.Zero, 0, ref iid, out store);
      if (store == null) return null;

      PROPERTYKEY pk = new PROPERTYKEY {
        fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"),
        pid = 5
      };
      PROPVARIANT pv;
      store.GetValue(ref pk, out pv);
      try {
        if (pv.vt == 31 /* VT_LPWSTR */ && pv.data1 != IntPtr.Zero) {
          return Marshal.PtrToStringUni(pv.data1);
        }
        if (pv.vt == 0) return "(empty)";
        return "(vt=" + pv.vt + ")";
      }
      finally {
        Native.PropVariantClear(ref pv);
        Marshal.ReleaseComObject(store);
      }
    }
  }
}
'@

if (-not (Test-Path $LnkPath)) { throw "Shortcut not found: $LnkPath" }

$aumid = [TodoReminder.AumidVerify.Reader]::ReadAumid($LnkPath)
Write-Host "Shortcut : $LnkPath"
Write-Host "AUMID    : $aumid"
