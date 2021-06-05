'use babel'

// import AWS from 'aws-sdk'
// import Minio from 'minio'

import path from 'path'
import uuidv4 from 'uuid/v4'
import Config from '../configs/config'
import UploadedFile from '../models/uploaded-file'

export default class S3Client {
  constructor() {
    // eslint-disable-next-line global-require
    const Minio = require('minio')
    // 获取配置
    this.config = new Config()
    const {
      s3UseSSL,
      accessKey, secretKey, s3Port, endPointUrl,
    } = this.config
    // 创建 minio
    this.minioClient = new Minio.Client({
      endPoint: endPointUrl,
      useSSL: s3UseSSL,
      port: s3Port,
      accessKey,
      secretKey,
    })
  }

  async upload(loadedFile) {
    // 获取配置
    const {
      s3UseSSL,
      s3Port,
      s3BucketName, s3DirectoryPath, useUuidAsFileName, endPointUrl, markdownListingCharacter,
    } = this.config
    // 校验存储桶是否存在
    const s3BucketAvailable = await this.checkS3BucketAvailable(s3BucketName)
    // 控制台打印上传的文件名称 和 文件类型
    console.log(`S3uploader start uploading: ${loadedFile.name} (${loadedFile.mimeType})`)

    // 开始上传文件
    return new Promise((resolve, reject) => {
      let s3Path = path.join(s3DirectoryPath, loadedFile.name)
      if (useUuidAsFileName) {
        const extension = path.extname(loadedFile.name)
        s3Path = path.join(s3DirectoryPath, `${markdownListingCharacter}${uuidv4()}${extension}`)
      }
      const metaData = {
        'Content-Type': loadedFile.mimeType,
        'X-Amz-Meta-Testing': 1234,
        example: 5678,
      }
      // minio上传文件
      this.minioClient.putObject(s3BucketName, s3Path, loadedFile.body, loadedFile.size, metaData,
        (err, etag) => {
          if (err) return console.log(err)
          // 拼接图片路径
          // eslint-disable-next-line no-useless-concat
          const url = s3UseSSL ? 'https://' : 'http://' + `${endPointUrl}:${s3Port}/${s3BucketName}/${s3Path}`
          console.log('File uploaded successfully.')
          console.log(`File uploaded to ${url}.`)
          resolve(new UploadedFile(loadedFile.name, url, loadedFile.mimeType))
        })
    })
  }

  // 检查 桶是否存在
  async checkS3BucketAvailable(s3BucketName) {
    return new Promise((resolve, reject) => {
      this.minioClient.bucketExists(s3BucketName, (err, exists) => {
        if (err) {
          console.log(err)
          reject(err)
        }
        if (exists) {
          resolve(true)
        }
      })
    })
  }

  //  获取桶
  // eslint-disable-next-line class-methods-use-this
  async getS3BucketLocation(s3BucketName) {
    return new Promise((resolve, reject) => {
      // this.s3.getBucketLocation({ Bucket: s3BucketName }, (error, data) => {
      //   if (error) {
      //     reject(error)
      //     return
      //   }
      //   resolve(data.LocationConstraint)
      // })
    })
  }
}
