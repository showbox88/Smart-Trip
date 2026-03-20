import ExifReader from 'exifreader';

/**
 * 从文件 Handle 中提取 EXIF 信息
 * @param {FileSystemFileHandle} fileHandle 
 * @returns {Promise<{latitude: number|null, longitude: number|null, date: string|null, time: string|null}>}
 */
export async function extractExifData(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);
    console.log(`EXIF tags for ${fileHandle.name}:`, tags);

    let latitude = null;
    let longitude = null;
    let date = null;
    let time = null;

    // 解析 GPS
    if (tags.GPSLatitude && tags.GPSLongitude) {
      // ExifReader 的 description 通常是十进制字符串，例如 "35.6586"
      latitude = parseFloat(tags.GPSLatitude.description);
      longitude = parseFloat(tags.GPSLongitude.description);
      
      // 检查南纬/西经
      if (tags.GPSLatitudeRef && tags.GPSLatitudeRef.value[0] === 'S') latitude = -latitude;
      if (tags.GPSLongitudeRef && tags.GPSLongitudeRef.value[0] === 'W') longitude = -longitude;
    }

    // 解析拍摄日期时间 (格式通常为 "YYYY:MM:DD HH:MM:SS")
    const dateTime = tags.DateTimeOriginal || tags.DateTime || tags.CreateDate;
    if (dateTime && dateTime.description) {
      const parts = dateTime.description.split(' ');
      if (parts.length >= 2) {
        date = parts[0].replace(/:/g, '-'); // "2023:05:20" -> "2023-05-20"
        time = parts[1];
      }
    }

    // 如果 EXIF 中没有时间，回退到文件系统的最后修改时间
    if (!date || !time) {
      const lastModified = new Date(file.lastModified);
      date = lastModified.toISOString().split('T')[0];
      time = lastModified.toTimeString().split(' ')[0]; // "HH:MM:SS"
    }

    return { latitude, longitude, date, time };
  } catch (error) {
    console.warn('Failed to extract EXIF, falling back to file stats:', error);
    try {
      const file = await fileHandle.getFile();
      const lastModified = new Date(file.lastModified);
      return { 
        latitude: null, 
        longitude: null, 
        date: lastModified.toISOString().split('T')[0], 
        time: lastModified.toTimeString().split(' ')[0] 
      };
    } catch (e) {
      return { latitude: null, longitude: null, date: null, time: null };
    }
  }
}
