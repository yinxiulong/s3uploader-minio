'use babel'

export default class Config {
  constructor() {
    // Make it singleton.
    // [JavaScript Design Patterns: The Singleton — SitePoint](https://www.sitepoint.com/javascript-design-patterns-singleton/)
    if (!Config.instance) {
      this.secretKey = atom.config.get('s3uploader-minio.secretKey')
      this.accessKey = atom.config.get('s3uploader-minio.accessKey')
      this.s3BucketName = atom.config.get('s3uploader-minio.s3BucketName')
      this.s3Port = atom.config.get('s3uploader-minio.s3Port')
      this.s3UseSSL = atom.config.get('s3uploader-minio.s3UseSSL')
      this.endPointUrl = atom.config.get('s3uploader-minio.endPointUrl')
      this.s3DirectoryPath = atom.config.get('s3uploader-minio.s3DirectoryPath')
      this.useUuidAsFileName = atom.config.get('s3uploader-minio.useUuidAsFileName')
      this.markdownListingCharacter = atom.config.get('s3uploader-minio.markdownListingCharacter')
      Config.instance = this
    }

    return Config.instance
  }
}
