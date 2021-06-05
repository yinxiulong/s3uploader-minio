'use babel'

import { CompositeDisposable } from 'atom'
import { clipboard } from 'electron'
import path from 'path'
import fs from 'fs'
import Config from './configs/config'
import S3Client from './services/s3client'
import ProgressModalView from './views/progress-modal-view'
import LoadedFile from './models/loaded-file'
import WriterFactory from './writers/writer-factory'

export default {
  config: {
    // 自定义 Minio 服务器地址
    endPointUrl: {
      title: '请输入Minio 服务器地址 (必须)',
      type: 'string',
      default: '',
      order: 1,
    },
    // minio 端口
    s3Port: {
      title: '请输入Minio 端口',
      type: 'number',
      default: 9000,
      order: 2,
    },
    s3UseSSL: {
      title: '是否为https 请求',
      type: 'boolean',
      default: false,
      order: 3,
    },
    // 存储桶名称
    s3BucketName: {
      title: '请输入BucketName 名称',
      type: 'string',
      default: '',
      order: 4,
    },
    // 存储桶下的路径
    s3DirectoryPath: {
      title: '请输入BucketName 下的 path',
      type: 'string',
      default: '',
      order: 5,
    },
    // 帐号
    accessKey: {
      title: '请输入Minio accessKey  (必须)',
      type: 'string',
      default: 'accessKey',
      order: 6,
    },
    // 密码
    secretKey: {
      title: '请输入Minio secretKey  (必须)',
      type: 'string',
      default: 'secretKey',
      order: 7,
    },
    // 自定义前缀
    useUuidAsFileName: {
      title: '自定义上传的文件名称前缀, 如minio-==>minio-xxxx.img',
      type: 'boolean',
      default: true,
      order: 8,
    },
    markdownListingCharacter: {
      title: 'Listing character of Markdown when uploading multiple files',
      type: 'string',
      default: '-',
      order: 9,
    },
  },

  subscriptions: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable()

    // Register commands.
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        's3uploader-minio:openSettingsView': event => {
          this.openSettingsView(event)
        },
      }),
    )

    this.subscriptions.add(
      atom.workspace.observeTextEditors(textEditor => {
        const textEditorElement = atom.views.getView(textEditor)
        // by drag & drop. 监听托放事件
        textEditorElement.addEventListener('drop', event => {
          debugger
          event.preventDefault()
          event.stopPropagation()

          const scope = textEditor.getRootScopeDescriptor()
          const { files } = event.dataTransfer
          this.loadDroppedFiles(files).then(loadedFiles => {
            this.uploadFilesAndWriteLinks(loadedFiles, textEditor)
          })
        })

        // by copy & paste. 监听复制粘贴
        textEditorElement.addEventListener('keydown', event => {
          console.log(event.ctrlKey, event.keyCode, event.metaKey)
          // if (!(event.metaKey && event.keyCode === 86))
          if ((event.ctrlKey || event.metaKey) && event.keyCode === 86) {
            let fileName = clipboard.readText()
            const image = clipboard.readImage()
            if (image.isEmpty()) return // Only support image upload.

            const mimeType = image.toDataURL().match(/^data:([\w/]+);/)[1]
            if (!mimeType) return // Not found MIMEType.
            let tempFilePath = null
            // 获取文件的扩展名
            const extension = path.extname(fileName)
            let fileBody = null
            switch (extension) {
              case '.jpg':
              case '.jpeg':
                fileBody = clipboard.readImage().toJpeg(100)
                break
              case '.png':
                fileBody = clipboard.readImage().toPNG()
                break
              default:
                fileName = `tmp_${(Math.random() * 1e6 | 0).toString(32)}${extension || '.png'}`
                fileBody = clipboard.readImage().toPNG()
            }

            event.preventDefault()
            event.stopPropagation()

            const scope = textEditor.getRootScopeDescriptor()

            tempFilePath = __dirname + fileName
            fs.writeFileSync(tempFilePath, Buffer.from(fileBody))
            const readStream = fs.createReadStream(tempFilePath)
            // 删除临时文件
            fs.unlink(tempFilePath, err => {
              if (err) {
                throw err
              }
              console.log(`文件:${tempFilePath}删除成功！`)
            })
            const files = [new LoadedFile(readStream, fileName, mimeType)]
            this.uploadFilesAndWriteLinks(files, textEditor)
          }
        })
      }),
    )
  },

  deactivate() {
    this.subscriptions.dispose()
  },

  async loadDroppedFiles(droppedFiles) {
    const promises = []
    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i]
      const promise = LoadedFile.buildByFilePath(file.path, file.name, file.type)
      promises.push(promise)
    }
    return Promise.all(promises)
  },

  uploadFilesAndWriteLinks(loadedFiles, textEditor) {
    const { modalView, modalPanel: progressModal } = this.showProgressModal()

    this.uploadFiles(loadedFiles).then(uploadedFiles => {
      const writer = WriterFactory.buildWriter(textEditor)
      writer.writeLinks(uploadedFiles)
      if (progressModal) progressModal.destroy()
      atom.notifications.add('success', '文件上传成功！')
    }).catch(error => {
      atom.notifications.addError(`Something went wrong: ${error}`)
      console.error(error)
      if (progressModal) progressModal.destroy()
    })
  },
  // 显示错误弹框
  showProgressModal(title = '正在上传.....', message = '请您耐心等待片刻.....') {
    const modalView = new ProgressModalView({ title, message })
    const modalPanel = atom.workspace.addModalPanel({ item: modalView.getElement() })
    return { modalView, modalPanel }
  },

  // 上传文件
  async uploadFiles(loadedFiles) {
    const config = new Config()
    if (!config.s3BucketName) throw new Error('S3 Bucket Name should be specified in settings.')

    const s3client = new S3Client()
    const uploadPromises = loadedFiles.map(loadedFile => s3client.upload(loadedFile))
    return Promise.all(uploadPromises)
  },

  openSettingsView(event) {
    atom.workspace.open('atom://config/packages/s3uploader-minio', { pending: false })
    return true
  },
}
