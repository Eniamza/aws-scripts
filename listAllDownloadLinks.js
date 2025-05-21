// THIS SCRIPT LISTS ALL OBJECTS IN A SPECIFIED S3 BUCKET AND FOLDER
// AND PRINTS THEIR PUBLIC DOWNLOAD LINKS
// THE BUCKET MUST BE PUBLICLY ACCESSIBLE

require('dotenv').config()
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const readlineSync = require('readline-sync');

const REGION = readlineSync.question('Enter the AWS region (e.g., us-west-2): ');
const BUCKET = readlineSync.question('Enter the S3 bucket name: ');
const FOLDER = readlineSync.question('Enter the folder path (e.g., folder/subfolder): ');

if (FOLDER && !FOLDER.endsWith('/')) {
    FOLDER += '/';
  }

const s3 = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    }
  });

  async function listKeysInFolder(prefix) {
    const allKeys = [];
    let token;
  
    do {
      const cmd = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000
      });
      const { Contents, NextContinuationToken } = await s3.send(cmd);
      if (Contents) {
        Contents.forEach(obj => {
          // skip “folder” objects if you just want files
          if (obj.Key !== prefix) {
            allKeys.push(obj.Key);
          }
        });
      }
      token = NextContinuationToken;
    } while (token);
  
    return allKeys;
  }

  function getPublicS3Url(bucket, region, key) {
    const safeKey = encodeURIComponent(key).replace(/%2F/g, "/");
    const host = region === "us-east-1"
      ? `${bucket}.s3.amazonaws.com`
      : `${bucket}.s3.${region}.amazonaws.com`;
    return `https://${host}/${safeKey}`;
  }

  (async () => {
    try {
      console.log(`\nListing objects in s3://${BUCKET}/${FOLDER} …`);
      const keys = await listKeysInFolder(FOLDER);
      if (keys.length === 0) {
        console.log('No objects found under that prefix.');
        return;
      }

      let allFileLinks = [];
  
      console.log(`\nFound ${keys.length} object(s):\n`);
      keys.forEach(key => {
        const url = getPublicS3Url(BUCKET, REGION, key);
        console.log(`• ${key}\n`);
        console.log(`${url}\n`);
        allFileLinks.push(url);
      });
    } catch (err) {
      console.error("Error fetching or printing URLs:", err);
    }
  })();


