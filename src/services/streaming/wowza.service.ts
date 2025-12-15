import * as crypto from 'crypto';

function generateWowzaPublisherToken(streamName: string): Record<string, string> {
  // Environment variables
  const WOWZA_BASE_URL = process.env.WOWZA_BASE_URL || '';
  const WOWZA_APPLICATION_NAME = process.env.WOWZA_APPLICATION_NAME || '';
  const WOWZA_USERNAME = process.env.WOWZA_USERNAME || '';
  const WOWZA_PASSWORD = process.env.WOWZA_PASSWORD || '';
  
  // Token validity (1 hour from now)
  const startTime = Math.floor(Date.now() / 1000);
  const endTime = startTime + 3600; // 1 hour validity
  
  // Create content path
  const contentPath = `${WOWZA_APPLICATION_NAME}/${streamName}`;
  
  // Build parameters for hashing (must be in alphanumeric order)
  const params: string[] = [];
  
  if (startTime !== null) {
    params.push(`wowzatokenstarttime=${startTime}`);
  }
  
  if (endTime !== null) {
    params.push(`wowzatokenendtime=${endTime}`);
  }
  
  params.push(WOWZA_PASSWORD);
  
  params.sort();
  
  // Create hash string
  const hashString = contentPath + '?' + params.join('&');
  
  // Generate proper SHA-256 hash
  const hash = crypto.createHash('sha256')
    .update(hashString, 'utf8')
    .digest('base64')
    .replace(/\//g, '_')
    .replace(/\+/g, '-');
  
  // Return authentication token object
  return {
    username: WOWZA_USERNAME,
    password: WOWZA_PASSWORD,
    token: hash,
    starttime: startTime.toString(),
    endtime: endTime.toString(),
    applicationName: WOWZA_APPLICATION_NAME,
    streamName: streamName,
    serverURL: WOWZA_BASE_URL
  };
}

export { generateWowzaPublisherToken };