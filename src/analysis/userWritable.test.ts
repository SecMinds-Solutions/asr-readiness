import { isUserWritableLocation } from './userWritable';

describe('isUserWritableLocation', () => {
  it.each([
    'C:\\Users\\ada\\Downloads\\setup.exe',
    'C:\\Users\\ada\\AppData\\Local\\Temp\\x.exe',
    'c:\\users\\ada\\appdata\\roaming\\tool\\tool.exe',
    'C:\\Users\\Public\\run.exe',
    'C:\\Windows\\Temp\\x.exe',
    'C:\\Windows\\Tasks\\x.exe',
    'C:\\Windows\\tracing\\x.exe',
    'C:\\Windows\\System32\\Tasks\\x.exe',
    'C:\\Windows\\System32\\spool\\drivers\\color\\x.exe',
    'C:\\Windows\\SysWOW64\\Tasks\\x.exe',
    'C:\\ProgramData\\Vendor\\agent.exe',
    'C:\\Tools\\tool.exe',
    'C:\\$Recycle.Bin\\x.exe',
    'D:\\setup.exe',
    'E:\\Apps\\app.exe',
    '\\\\fileserver\\share\\app.exe',
    'C:/Users/ada/Downloads/setup.exe',
    'C:\\Program Files\\..\\Users\\ada\\x.exe',
    '',
    'setup.exe',
    'C:\\Windows\\Tasks',
    'C:\\Windows\\Temp',
    'C:\\Windows\\PLA\\Reports\\x.exe',
    'C:\\Windows\\SysWOW64\\Microsoft\\Crypto\\RSA\\MachineKeys\\x.exe',
    '\\\\?\\C:\\Users\\ada\\x.exe',
    '\\Device\\HarddiskVolume3\\Program Files\\x.exe',
  ])('treats %s as a User-writable location', (path) => {
    expect(isUserWritableLocation(path)).toBe(true);
  });

  it.each([
    'C:\\Program Files\\Contoso\\addin.exe',
    'C:\\Program Files (x86)\\Contoso\\addin.exe',
    'c:\\program files\\microsoft office\\root\\office16\\winword.exe',
    'C:\\Windows\\System32\\cmd.exe',
    'C:\\Windows\\SysWOW64\\wscript.exe',
    'C:\\Windows\\explorer.exe',
    'C:\\Program Files\\Contoso',
    '\\\\?\\C:\\Program Files\\Contoso\\addin.exe',
  ])('treats %s as a location ordinary users cannot write to', (path) => {
    expect(isUserWritableLocation(path)).toBe(false);
  });
});
