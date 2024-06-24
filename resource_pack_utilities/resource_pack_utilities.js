(() => {
  const path = require("node:path")
  const zlib = require("node:zlib")
  const os = require("node:os")
  let dialog, action, styles
  const id = "resource_pack_utilities"
  const name = "Resource Pack Utilities"
  const icon = "construction"
  const description = "Utilities for working with resource packs"

  const releasePattern = new RegExp("^[\\d\\.]+$")
  const invalidDirPattern = new RegExp('[\\\\/:*?"<>|`]')
  const manifest = {
    latest: {},
    versions: []
  }
  let outputLog = []

  const setupPlugin = () => Plugin.register(id, {
    title: name,
    icon: "icon.png",
    author: "Ewan Howell",
    description,
    tags: ["yes"],
    version: "1.0.0",
    min_version: "4.10.0",
    variant: "desktop",
    website: `https://ewanhowell.com/plugins/${id.replace(/_/g, "-")}/`,
    repository: `https://github.com/ewanhowell5195/blockbenchPlugins/tree/main/${id}`,
    bug_tracker: `https://github.com/ewanhowell5195/blockbenchPlugins/issues?title=[${name}]`,
    creation_date: "2024-06-18",
    has_changelog: true,
    async onload() {
      let directory
      if (os.platform() === "win32") {
        directory = path.join(os.homedir(), "AppData", "Roaming", ".minecraft")
      } else if (os.platform() === "darwin") {
        directory = path.join(os.homedir(), "Library", "Application Support", "minecraft")
      } else {
        directory = path.join(os.homedir(), ".minecraft")
      }
      new Setting("minecraft_directory", {
        value: directory,
        category: "defaults",
        type: "click",
        name: `${name} - Minecraft Directory`,
        description: "The location of your .minecraft folder",
        icon: "folder_open",
        click() {
          const dir = Blockbench.pickDirectory({
            title: "Select your .minecraft folder",
            startpath: settings.minecraft_directory.value
          })
          if (dir) {
            settings.minecraft_directory.value = dir
            Settings.saveLocalStorages()
          }
        }
      })
      new Setting("cache_directory", {
        value: "",
        category: "defaults",
        type: "click",
        name: `${name} - Cache Directory`,
        description: "The location to cache downloaded content",
        icon: "database",
        click() {
          const dir = Blockbench.pickDirectory({
            title: "Select a folder to cache downloaded content",
            startpath: settings.cache_directory.value
          })
          if (dir) {
            settings.cache_directory.value = dir
            Settings.saveLocalStorages()
          }
        }
      })
      const methods = {
        selectFolder(title = "folder", key = "folder") {
          const dir = Blockbench.pickDirectory({
            title: `Select ${title}`,
            startpath: path.join(settings.minecraft_directory.value, "resourcepacks")
          })
          if (dir) {
            this[key] = dir
          }
        }
      }
      styles = Blockbench.addCSS(`
        .rpu-code {
          background-color: var(--color-back);
          border: 1px solid var(--color-border);
          padding: 0 2px;
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
            outline: 0 solid transparent;
          }
          12.5%, 62.5% {
            transform: translateX(10px);
            outline: 4px solid var(--color-danger);
          }
          37.5%, 87.5% {
            transform: translateX(-10px);
            outline: 4px solid var(--color-danger);
          }
        }
      `)
      dialog = new Dialog({
        id,
        title: name,
        width: 780,
        buttons: [],
        cancel_on_click_outside: false,
        lines: [`<style>#${id} {
          .dialog_content {
            margin: 0;
          }

          button:disabled {
            opacity: .5;
            cursor: not-allowed;

            &:hover {
              background-color: var(--color-button);
              color: var(--color-text) !important;
            }
          }

          button.has-icon {
            text-decoration: none;

            &:focus span {
              text-decoration: underline
            }
          }

          button.material-icons {
            min-width: 32px;
            padding: 0;

            &:focus {
              text-decoration: none;
              color: var(--color-light);
            }

            &.icon {
              background-color: initial;

              &:focus {
                color: var(--color-text) !important;
              }

              &:hover {
                color: var(--color-light) !important;
              }
            }
          }

          code {
            background-color: var(--color-back);
            border: 1px solid var(--color-border);
            padding: 0 2px;
          }

          input[type="text"] {
            background-color: var(--color-back);
            padding: 0 8px;
            border: 1px solid var(--color-border);
            height: 32px;
          }

          h1, h3, p {
            margin: 0;
            padding: 0;
          }

          h3 {
            margin-bottom: -8px;
          }

          #home {
            margin: 16px;
            display: flex;
            gap: 8px;

            > div {
              flex: 1 1 0px;
              background-color: var(--color-back);
              padding: 8px 16px 16px;
              cursor: pointer;
              display: flex;
              flex-direction: column;
              gap: 8px;

              * {
                cursor: pointer;
              }

              &:hover {
                background-color: var(--color-button);
              }
            }

            h3 {
              font-weight: 700;
              font-size: 28px;
              color: var(--color-light);
            }
          }

          #header {
            background-color: var(--color-back);
            position: relative;
            padding: 8px 40px 16px 16px;

            h1 {
              font-weight: 600;
              color: var(--color-light);
            }
          }

          #back-button {
            position: absolute;
            top: 8px;
            right: 8px;
            background-color: initial;
            display: flex;
            align-items: center;
            min-width: initial;
            padding: 0 8px;

            &:hover {
             color: var(--color-light) !important;
            }

            &:disabled {
              pointer-events: initial;
              cursor: not-allowed;

              &:hover {
                color: var(--color-text) !important;
              }
            }
          }

          #info-button {
            position: absolute;
            bottom: 8px;
            right: 8px;
          }

          .utility {
            margin: 16px;
            display: flex;
            gap: 16px;
            flex-direction: column;

            > div, .col {
              display: flex;
              gap: 16px;
              flex-direction: column;
            }

            .row {
              display: flex;
              gap: 48px;
              flex-direction: row;
            }
          }

          .component-checkboxRow > .disabled {
            cursor: not-allowed;

            * {
              color: var(--color-subtle_text);
              cursor: not-allowed;
            }
          }

          ${Object.entries(components).filter((([k, v]) => v.styles)).map(([k, v]) => `.component-${k} { ${v.styles} }`).join("")}
          ${Object.entries(utilities).filter((([k, v]) => v.component.styles)).map(([k, v]) => `.utility-${k} { ${v.component.styles} }`).join("")}
        }</style>`],
        component: {
          data: {
            utility: null,
            utilities,
            status: {
              processing: false,
              finished: false
            }
          },
          components: Object.fromEntries(Object.entries(utilities).map(([k, v]) => {
            v.component.props = ["value"]
            const data = v.component.data
            v.component.data = function() {
              return {
                ...data,
                status: this.value
              }
            }
            v.component.watch = {
              value(val) {
                this.status = val
              },
              status(val) {
                this.$emit("input", val)
              }
            }
            v.component.components = Object.fromEntries(Object.entries(components).map(([k, v]) => {
              v.template = `<div ref="container" class="component-${k}">${v.template}</div>`
              return [k, Vue.extend(v)]
            }))
            v.component.methods ??= {}
            v.component.methods = { ...v.component.methods, ...methods }
            v.component.template = `<div ref="container" class="utility utility-${k}">${v.component.template}</div>`
            return [k, Vue.extend(v.component)]
          })),
          watch: {
            status(val) {
              if (val.processing) {
                const styles = document.createElement("style")
                styles.id = `${id}-processing-styles`
                styles.innerHTML = `
                  #${id} {
                    .dialog_close_button {
                      pointer-events: none;
                      opacity: .5;
                    }

                    .dialog_handle::before, #header::before {
                      content: "";
                      position: absolute;
                      top: 0;
                      right: 0;
                      bottom: 0;
                      width: 30px;
                      cursor: not-allowed;
                    }
                  }
                `
                document.body.append(styles)
              } else {
                document.getElementById(`${id}-processing-styles`)?.remove()
              }
            }
          },
          methods: {
            showInfo() {
              new Dialog({
                id: `${id}-info`,
                title: `${utilities[this.utility].name} Info`,
                buttons: ["dialog.close"],
                lines: [
                  `<style>#${id}-info {
                    ul {
                      margin-bottom: 8px;
                    }

                    li {
                      list-style: initial;
                      margin-left: 20px;

                      li {
                        list-style: circle;

                        li {
                          list-style: square;
                        }
                      }
                    }

                    code {
                      background-color: var(--color-back);
                      border: 1px solid var(--color-border);
                      padding: 0 2px;
                    }

                    h3 {
                      margin: 0 0 8px 0;
                      padding: 0;
                      font-weight: 700;
                    }
                  }</style>`,
                  utilities[this.utility].info
                ],
                width: 780
              }).show()
            }
          },
          template: `
            <div>
              <div v-if="utility" id="header">
                <h1>{{ utilities[utility].name }}</h1>
                <span>{{ utilities[utility].description }}</span>
                <button id="back-button" @click="utility = null; status.finished = false" :disabled="status.processing"><i class="material-icons">arrow_back</i> Back</button>
                <button v-if="utilities[utility].info" id="info-button" class="material-icons icon" @click="showInfo">info</button>
              </div>
              <div v-if="utility === null" id="home">
                <div v-for="(data, id) in utilities" @click="utility = id">
                  <h3>{{ data.name }}</h3>
                  <div>{{ data.tagline }}</div>
                </div>
              </div>
              <component v-for="(data, id) in utilities" v-if="utility === id" :is="id" v-model="status"></component>
            </div>
          `
        },
        onConfirm(r, e) {
          if (Keybinds.extra.confirm.keybind.isTriggered(e)) return false
        },
        async onBuild() {
          const data = await fetch("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json").then(e => e.json())
          data.versions.splice(data.versions.findIndex(e => e.id === "1.6"), 1)
          manifest.latest = data.latest
          manifest.versions = data.versions.slice(0, data.versions.findIndex(e => e.id === "13w24a") + 1)
        },
        async onOpen() {
          if (!await exists(settings.minecraft_directory.value)) {
            new Dialog({
              title: "The .minecraft directory was not found",
              lines: ['When prompted, please select your <code class="rpu-code">.minecraft</code> folder'],
              width: 450,
              buttons: ["dialog.ok"],
              onClose() {
                const dir = Blockbench.pickDirectory({
                  title: "Select your .minecraft folder",
                  startpath: settings.minecraft_directory.value
                })
                if (dir) {
                  settings.minecraft_directory.value = dir
                  Settings.saveLocalStorages()
                } else {
                  dialog.close()
                }
              }
            }).show()
          }
        }
      })
      action = new Action({
        id,
        name,
        description,
        icon,
        click: () => dialog.show()
      })
      MenuBar.addAction(action, "tools")
      document.addEventListener("keydown", copyText)
      // dialog.show()
      // dialog.content_vue.utility = "packCreator"
    },
    onunload() {
      document.removeEventListener("keydown", copyText)
      dialog.close()
      action.delete()
      styles.delete()
      document.getElementById(`${id}-processing-styles`)?.remove()
    }
  })

  const getFiles = async function*(dir) {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const dirent of dirents) {
      const res = path.resolve(dir, dirent.name)
      if (dirent.isDirectory()) {
        yield* getFiles(res)
      } else if (!res.match(/([\/\\]|^)\.git([\/\\]|$)/)) {
        yield res
      }
    }
  }

  const sizes = ["B", "KB", "MB", "GB", "TB"]
  function formatBytes(bytes) {
    if (bytes === 0) return "0 B"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + " " + sizes[i]
  }

  async function loadImage(imagePath) {
    const imageData = await fs.promises.readFile(imagePath)
    const base64Data = imageData.toString("base64")
    const img = new Image()
    img.src = `data:image/png;base64,${base64Data}`
    await img.decode()
    return img
  }

  function confirm(title, message) {
    return new Promise(fulfil => Blockbench.showMessageBox({
      title,
      message: message + "\n\nThis action cannot be undone!",
      buttons: ["dialog.confirm", "dialog.cancel"],
      width: 512
    }, b => fulfil(!b)))
  }

  function formatPath(path) {
    return path.replace(/\\/g, "/")
  }

  function exists(path) {
    return new Promise(async fulfil => {
      try {
        await fs.promises.access(path)
        fulfil(true)
      } catch {
        fulfil(false)
      }
    })
  }

  function copyText(evt) {
    if (event.ctrlKey && event.key === "c") {
      const selection = window.getSelection()
      const text = selection.toString()
      if (text) {
        let parent = selection.anchorNode.parentElement
        while (parent) {
          if (parent.id === "resource_pack_utilities") {
            navigator.clipboard.writeText(text)
            break
          }
          parent = parent.parentElement
        }
      }
    }
  }

  const td = new TextDecoder
  function parseZip(zip) {
    const ua = new Uint8Array(zip)
    const dv = new DataView(zip)

    const offEOCD = ua.findLastIndex((e, i, a) => e === 0x50 && a[i+1] === 0x4b && a[i+2] === 0x05 && a[i+3] === 0x06)
    const offCenDir = dv.getUint32(offEOCD + 16, true)
    const recordCount = dv.getUint16(offEOCD + 10, true)

    const parsedZip = {
      buffer: zip,
      array: ua,
      view: dv,
      eocdOffset: offEOCD,
      centralDirOffset: offCenDir,
      fileCount: recordCount,
      files: {}
    }

    for (let i = 0, o = offCenDir; i < recordCount; i++) {
      const n = dv.getUint16(o + 28, true)
      const m = dv.getUint16(o + 30, true)
      const k = dv.getUint16(o + 32, true)
      const encodedPath = ua.subarray(o + 46, o + 46 + n)
      const filePath = td.decode(encodedPath)

      if (!filePath.endsWith("/") && (filePath.startsWith("assets/") || ["pack.mcmeta", "version.json", "pack.png"].includes(filePath)) && !/\.(class|nbt|mcassetsroot)$/.test(filePath)) {
        const h = dv.getUint32(o + 42, true)
        const q = dv.getUint16(h + 8,  true)
        const t = dv.getUint16(h + 10, true)
        const d = dv.getUint16(h + 12, true)
        const s = dv.getUint32(o + 20, true)
        const a = dv.getUint32(o + 24, true)
        const e = dv.getUint16(h + 28, true)

        parsedZip.files[filePath] = {
          path: filePath,
          compressedSize: s,
          size: a,
          crc32: dv.getUint32(o + 16, true),
          timeValue: t,
          dateValue: d,
          encodedPath,
          compressionMethod: q,
          compressedContent: ua.subarray(h + 30 + n + e, h + 30 + n + e + s)
        }
        if (q === 0) {
          parsedZip.files[filePath].content = parsedZip.files[filePath].compressedContent
        } else {
          Object.defineProperty(parsedZip.files[filePath], 'content', {
            configurable: true,
            enumerable: true,
            get() {
              const c = zlib.inflateRawSync(this.compressedContent)
              Object.defineProperty(this, 'content', {
                value: c,
                configurable: true,
                enumerable: true
              })
              return c
            }
          })
        }
      }

      o += 46 + n + m + k
    }

    return parsedZip
  }

  async function cacheDirectory() {
    if (!await exists(settings.cache_directory.value)) {
      outputLog.push("Cache directory not found. Please set a new one")
      return new Promise(fulfil => {
        new Dialog({
          title: "The cache directory was not found",
          lines: ["When prompted, please select a folder to cache downloaded content"],
          width: 512,
          buttons: ["dialog.ok"],
          onClose() {
            let dir
            while (!dir) {
              dir = Blockbench.pickDirectory({
                title: "Select a folder to cache downloaded content",
                startpath: settings.cache_directory.value
              })
            }
            settings.cache_directory.value = dir
            Settings.saveLocalStorages()
            outputLog.push(`Cache directory set to \`${formatPath(settings.cache_directory.value)}\``)
            fulfil()
          }
        }).show()
      })
    }
  }

  function getVersion(id) {
    return manifest.versions.find(e => e.id === id)
  }

  async function getVersionData(id) {
    const version = getVersion(id)
    if (version.data) {
      return version.data
    }
    const vanillaDataPath = path.join(settings.minecraft_directory.value, "versions", id, id + ".json")
    if (await exists(vanillaDataPath)) {
      version.data = JSON.parse(await fs.promises.readFile(vanillaDataPath))
      return version.data
    }
    await cacheDirectory()
    const cacheDataPath = path.join(settings.cache_directory.value, `data_${id}.json`)
    if (await exists(cacheDataPath)) {
      version.data = JSON.parse(await fs.promises.readFile(cacheDataPath))
      return version.data
    }
    version.data = await fetch(version.url).then(e => e.json())
    await fs.promises.writeFile(cacheDataPath, JSON.stringify(version.data), "utf-8")
    return version.data
  }

  async function getVersionAssetsIndex(id) {
    const version = await getVersionData(id)
    if (version.assetsIndex) {
      return version.assetsIndex
    }
    const vanillaAssetsIndexPath = path.join(settings.minecraft_directory.value, "assets", "indexes", version.assets + ".json")
    if (await exists(vanillaAssetsIndexPath)) {
      version.assetsIndex = JSON.parse(await fs.promises.readFile(vanillaAssetsIndexPath))
      return version.assetsIndex
    }
    await cacheDirectory()
    const cacheAssetsIndexPath = path.join(settings.cache_directory.value, `assets_index_${version.assets}.json`)
    if (await exists(cacheAssetsIndexPath)) {
      version.assetsIndex = JSON.parse(await fs.promises.readFile(cacheAssetsIndexPath))
      return version.assetsIndex
    }
    version.assetsIndex = await fetch(version.assetIndex.url).then(e => e.json())
    await fs.promises.writeFile(cacheAssetsIndexPath, JSON.stringify(version.assetsIndex), "utf-8")
    return version.assetsIndex
  }

  async function getVersionJar(id) {
    let jar
    const jarPath = path.join(settings.minecraft_directory.value, "versions", id, id + ".jar")
    if (await exists(jarPath)) {
      jar = parseZip((await fs.promises.readFile(jarPath)).buffer)
      outputLog.push(`Using downloaded version of \`${id}\``)
    } else {
      await cacheDirectory()
      const jarPath = path.join(settings.cache_directory.value, id + ".jar")
      if (await exists(jarPath)) {
        jar = parseZip((await fs.promises.readFile(jarPath)).buffer)
        outputLog.push(`Using cached version of \`${id}\``)
      } else {
        outputLog.push(`\`${id}\` was not found on your computer, downloading…`)
        const version = await getVersionData(id)
        const client = await fetch(version.downloads.client.url).then(e => e.arrayBuffer())
        fs.promises.writeFile(jarPath, new Uint8Array(client))
        outputLog.push(`\`${id}\` downloaded`)
        jar = parseZip(client)
      }
    }
    return jar
  }

  const components = {
    folderSelector: {
      props: ["value"],
      data() {
        return {
          folder: this.value ?? ""
        }
      },
      watch: {
        value(newVal) {
          this.folder = newVal
        }
      },
      methods: {
        selectFolder(title = "folder") {
          const dir = Blockbench.pickDirectory({
            title: `Select ${title}`,
            startpath: this.folder || path.join(settings.minecraft_directory.value, "resourcepacks")
          })
          if (dir) {
            this.folder = dir
            this.$emit("input", this.folder)
          }
        },
        input() {
          this.$emit("input", this.folder)
        },
        formatPath
      },
      computed: {
        buttonText() {
          return this.$slots.default[0].text
        }
      },
      styles: `
        .folder-selector {
          display: flex;
          cursor: pointer;
        }

        input {
          flex: 1;
          pointer-events: none;
        }
      `,
      template: `
        <div class="folder-selector" @click="selectFolder(buttonText)">
          <input disabled type="text" :value="formatPath(folder)" placeholder="Select Folder">
          <button class="material-icons">folder_open</button>
        </div>
      `
    },
    checkboxRow: {
      props: ["value", "disabled"],
      styles: `
        label {
          display: flex;
          gap: 4px;
          align-items: center;
          cursor: pointer;

          * {
            cursor: pointer;
          }
        }
      `,
      template: `
        <label :class="{ disabled }">
          <input type="checkbox" :checked="value" :disabled="disabled" @input="$emit('input', $event.target.checked)">
          <div><slot></slot></div>
        </label>
      `
    },
    inputRow: {
      props: ["value", "placeholder", "width", "required"],
      styles: `
        display: flex;
        gap: 8px;
        align-items: center;

        input {
          flex: 1;
        }

        .required {
          border: 1px solid var(--color-error);
          animation: shake .5s ease-in-out;
        }
      `,
      template: `
        <div :style="{ width: width ? width.toString() + 'px' : 'initial' }"><slot></slot>:</div>
        <input type="text" :class="{ required }" :placeholder="placeholder" :value="value" @input="$emit('input', $event.target.value)">
      `
    },
    ignoreList: {
      props: ["value"],
      data() {
        return {
          newWord: "",
          ignoreList: this.value
        }
      },
      watch: {
        value(val) {
          this.ignoreList = val
        },
        ignoreList(val) {
          this.$emit("input", val)
        }
      },
      methods: {
        addWord() {
          if (this.newWord && !this.ignoreList.includes(this.newWord.toLowerCase())) {
            this.ignoreList.push(this.newWord.toLowerCase())
          }
          this.newWord = ""
          setTimeout(() => this.$refs.input.focus(), 0)
        }
      },
      styles: `
        display: flex;
        flex-direction: column;
        gap: 8px;

        > div {
          display: flex;
        }

        input {
          flex: 1;
        }

        ul {
          background-color: var(--color-back);
          border: 1px solid var(--color-border);
          height: 128px;
          overflow-y: auto;
        }

        li {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: space-between;
          padding-left: 8px;
          background-color: var(--color-ui);

          &:not(:first-child) {
            margin-top: 1px;
          }

          button {
            opacity: 0;
          }

          &:hover button {
            opacity: 1;
          }
        }
      `,
      template: `
        <h3>Ignore List</h3>
        <p>Files and folders that include these terms will be ignored</p>
        <div>
          <input type="text" placeholder="Enter term" v-model="newWord" ref="input" @keydown.enter="addWord">
          <button class="material-icons" @click="addWord">add</button>
        </div>
        <ul>
          <li v-for="(term, index) in ignoreList" :key="index">
            <span>{{ term }}</span>
            <button class="material-icons icon" @click="ignoreList.splice(index, 1)">close</button>
          </li>
        </ul>
      `
    },
    outputLog: {
      props: ["value"],
      data() {
        return {
          logs: this.value,
          waiting: false
        }
      },
      watch: {
        value(val) {
          if (this.waiting) return
          this.waiting = true
          setTimeout(() => {
            this.logs = val.slice()
            this.waiting = false
          }, 100)
        },
        logs() {
          if (this.$refs.log.scrollTop >= this.$refs.log.scrollHeight - this.$refs.log.clientHeight) {
            this.$nextTick(() => {
              this.scrollToBottom()
            })
          }
        }
      },
      methods: {
        scrollToBottom() {
          const container = this.$refs.log
          container.scrollTop = container.scrollHeight
        },
        copy() {
          navigator.clipboard.writeText(this.value.join("\n\n").replaceAll("`", ""))
          Blockbench.showQuickMessage("Log copied")
        },
        save() {
          Blockbench.export({
            extensions: ["txt"],
            type: "Text file",
            name: "log",
            content: this.value.join("\n\n").replaceAll("`", "")
          }, () => Blockbench.showQuickMessage("Saved log"))
        }
      },
      styles: `
        .log {
          height: 256px;
          overflow-y: auto;
          overflow-x: hidden;
          font-family: var(--font-code);
          background-color: var(--color-back);
          border: 1px solid var(--color-border);
          gap: 1px;
          
          > * {
            user-select: text;
            cursor: text;
            white-space: pre-wrap;
            max-width: 100%;
            overflow-wrap: anywhere;
            padding: 4px 4px 4px 24px;
            position: relative;
            font-size: 13px;

            &:not(:last-child) {
              border-bottom: 1px solid var(--color-border);
            }

            &::before {
              content: ">";
              position: absolute;
              left: 8px;
            }

            code {
              background-color: var(--color-border);
            }
          }
        }

        .buttons {
          display: flex;
          gap: 8px;
          margin-top: 8px;

          button {
            flex: 1;
          }
        }
      `,
      template: `
        <div class="log" ref="log">
          <div v-for="(log, index) in logs" :key="index" v-html="log.replace(/\`([^\`]*)\`/g, '<code>$1</code>').replaceAll('\uE000', '\`')"></div>
        </div>
        <div class="buttons">
          <button class="has-icon" @click="copy">
            <i class="material-icons">content_copy</i>
            <span>Copy Log</span>
          </button>
          <button class="has-icon" @click="save">
            <i class="material-icons">save</i>
            <span>Save Log</span>
          </button>
        </div>
      `
    },
    progressBar: {
      props: ["done", "total"],
      data() {
        return {
          displayedDone: 0,
          waiting: false
        }
      },
      watch: {
        done(val) {
          if (this.waiting) return
          this.waiting = true
          setTimeout(() => {
            this.displayedDone = this.done
            this.waiting = false
          }, 500)
        }
      },
      computed: {
        progressPercentage() {
          if (!this.displayedDone) return 0
          return Math.round(this.displayedDone / this.total * 100)
        }
      },
      styles: `
        display: flex;
        flex-direction: column;
        gap: 8px;

        .progress-bar-container {
          width: 100%;
          height: 24px;
          background-color: var(--color-back);
          position: relative;
        }

        .progress-bar {
          height: 100%;
          background-color: var(--color-accent);
          position: absolute;
          top: 4px;
          left: 4px;
          height: 16px;
          transition: width .5s ease;
        }

        div {
          text-align: center;
        }
      `,
      template: `
        <div class="progress-text">{{ total === null ? "Loading…" : displayedDone === total ? "Finished" : "Processing…" }}</div>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: 'calc(' + progressPercentage + '% - 8px)' }"></div>
        </div>
        <div v-if="typeof total === 'number' && total">{{ displayedDone }} / {{ total }} - {{ progressPercentage }}%</div>
        <div v-else>{{ progressPercentage }}%</div>
      `
    },
    versionSelector: {
      props: {
        value: {},
        width: {
          default: 120
        }
      },
      data() {
        return {
          version: this.value || manifest.versions.find(e => releasePattern.test(e.id))?.id,
          snapshots: false,
          manifest,
          releasePattern
        }
      },
      watch: {
        manifest: {
          handler(val) {
            if (this.value) return
            if (this.snapshots) {
              this.version = val.versions.find(e => !releasePattern.test(e.id)).id
            } else {
              this.version = val.versions.find(e => releasePattern.test(e.id)).id
            }
          },
          deep: true
        },
        version: {
          handler(val) {
            this.$emit("input", val)
          },
          immediate: true
        }
      },
      methods: {
        change() {
          this.version = this.manifest.versions.find(e => this.snapshots ? !releasePattern.test(e.id) : releasePattern.test(e.id)).id
        }
      },
      styles: `
        display: flex;
        align-items: center;
        gap: 8px;

        bb-select {
          flex: 1;
          min-width: 100px;
          cursor: pointer;
        }

        label {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;

          * {
            cursor: pointer;
          }
        }
      `,
      template: `
        <div :style="{ width: width.toString() + 'px' }">Minecraft Version:</div>
        <select-input v-model="version" :options="Object.fromEntries(manifest.versions.filter(e => snapshots ? !releasePattern.test(e.id) : releasePattern.test(e.id)).map(e => [e.id, e.id]))" @input="$emit('update:version', version)" />
        <label>
          <input type="checkbox" v-model="snapshots" @change="change">
          <div>Snapshots</div>
        </label>
      `
    }
  }

  const utilities = {
    jsonOptimiser: {
      name: "JSON Optimiser",
      tagline: "Optimise every JSON file in a folder.",
      description: "JSON Optimiser is a tool that will go through all JSON files in a folder and optimise them to be as small as possible, minifying them and removing any unnecessary data.",
      info: `
        <h3>Changes that JSON Optimiser makes:</h3>
        <ul>
          <li>Minifies <code>.json</code>, <code>.mcmeta</code>, <code>.jem</code>, and <code>.jpm</code> files</li>
          <li>Removes default credits. Custom credits are kept</li>
          <li>Removes unnecessary keys</li>
          <li>For block/item model <code>.json</code> files
            <ul>
              <li>Removes the <code>groups</code> object</li>
              <li>For the <code>rotation</code> object:
                <ul>
                  <li>Removes the <code>rotation</code> object when <code>angle</code> is set to <code>0</code></li>
                  <li>Removes the <code>rescale</code> property when it is set to <code>false</code></li>
                </ul>
              </li>
              <li>For the <code>faces</code> object:
                <ul>
                  <li>Removes the <code>rotation</code> property when it is set to <code>0</code></li>
                  <li>Removes the <code>tintindex</code> property when it is set to <code>-1</code></li>
                  <li>Removes empty <code>face</code> objects</li>
                </ul>
              </li>
              <li>Removes the <code>shade</code> property when it is set to <code>true</code></li>
              <li>Removes empty <code>elements</code> arrays</li>
            </ul>
          </li>
          <li>For animation <code>.mcmeta</code> files
            <ul>
              <li>Removes the file when the texture it is for does not exist</li>
              <li>Removes the <code>interpolate</code> property when it is set to<code>false</code></li>
              <li>Removes the <code>frametime</code> property when it is set to<code>1</code></li>
              <li>Removes the <code>width</code> property when the frames are square</li>
              <li>Removes the <code>height</code> property when the frames are square</li>
              <li>For the <code>frames</code> array
                <ul>
                  <li>Removes the <code>time</code> property when it matches the main <code>frametime</code> property</li>
                  <li>Removes the <code>frames</code> array when all the frames are present, in order, and match the main <code>frametime</code> property</li>
                  <li>Changes most common <code>time</code> property to be the main <code>frametime</code> property, and makes old the main <code>frametime</code> property into the <code>time</code> properties</li>
                </ul>
              </li>
            </ul>
          </li>
          <li>For OptiFine CEM <code>.jem</code>/<code>.jpm</code> files
            <ul>
              <li>Removes the <code>animations</code> array when it is empty</li>
              <li>Removes the <code>translation</code> array when all axes are set to <code>0</code></li>
              <li>Removes the <code>rotation</code> array when all axes are set to <code>0</code></li>
              <li>Removes the <code>scale</code> property when it is set to <code>1</code></li>
              <li>Removes empty <code>boxes</code> arrays</li>
              <li>Removes empty <code>sprites</code> arrays</li>
              <li>Removes empty <code>submodel</code> objects</li>
              <li>Removes empty <code>submodels</code> arrays</li>
            </ul>
          </li>
        </ul>
      `,
      component: {
        data: {
          folder: null,
          types: {
            json: true,
            mcmeta: true,
            jem: true,
            jpm: true
          },
          ignoreList: [],
          outputLog,
          done: 0,
          total: null,
          cancelled: false
        },
        methods: {
          async execute() {
            if (!(await confirm("Run JSON Optimiser?", `Are you sure you want to run JSON Optimiser over the following folder:\n<code>${formatPath(this.folder)}</code>\n\nMake a backup first if you would like to keep an un-optimised version of the folder.`))) return
            outputLog.length = 0
            this.status.finished = false
            this.status.processing = true
            this.done = 0
            this.total = null
            this.cancelled = false

            const mcmetaKeys = [ "credit", "animation", "villager", "texture", "pack", "language", "filter", "overlays", "gui" ]
            const animationKeys = [ "interpolate", "width", "height", "frametime", "frames" ]
            const jemKeys = [ "credit", "texture", "textureSize", "shadowSize", "models" ]
            const modelKeys = [ "model", "id", "part", "attach", "scale", "animations" ]
            const partKeys = [ "id", "texture", "textureSize", "invertAxis", "translate", "rotate", "mirrorTexture", "boxes", "sprites", "submodel", "submodels" ]
            const boxKeys = [ "textureOffset", "uvDown", "uvUp", "uvNorth", "uvSouth", "uvWest", "uvEast", "coordinates", "sizeAdd" ]
            const spriteKeys = [ "textureOffset", "coordinates", "sizeAdd" ]
            const elementKeys = [ "from", "to", "rotation", "faces", "shade" ]
            const faceKeys = [ "uv", "texture", "cullface", "rotation", "tintindex" ]
            modelKeys.push(...partKeys)

            function processPart(part, rootMode) {
              for (const key in part) {
                if (!(rootMode ? partKeys.concat(modelKeys) : partKeys).includes(key)) delete part[key]
              }
              if (part.translate && part.translate.every(e => !e)) delete part.translate
              if (part.rotate && part.rotate.every(e => !e)) delete part.rotate
              if (part.scale === 1) delete part.scale
              if (part.boxes) {
                for (const box of part.boxes) {
                  for (const key in box) {
                    if (!boxKeys.includes(key)) delete box[key]
                  }
                }
                part.boxes = part.boxes.filter(e => Object.keys(e).length)
                if (!part.boxes.length) delete part.boxes
              }
              if (part.sprites) {
                for (const sprite of part.sprites) {
                  for (const key in sprite) {
                    if (!spriteKeys.includes(key)) delete sprite[key]
                  }
                }
                part.sprites = part.sprites.filter(e => Object.keys(e).length)
                if (!part.sprites.length) delete part.sprites
              }
              if (part.submodel) {
                processPart(part.submodel)
                if (!Object.keys(part.submodel).length) delete part.submodel
              }
              if (part.submodels) {
                for (const submodel of part.submodels) {
                  processPart(submodel)
                }
                part.submodels = part.submodels.filter(e => Object.keys(e).length)
                if (!part.submodels.length) delete part.submodels
              }
            }

            const files = []
            for await (const file of getFiles(this.folder)) {
              if (
                (file.endsWith(".json") && !this.types.json) ||
                (file.endsWith(".mcmeta") && !this.types.mcmeta) ||
                (file.endsWith(".jem") && !this.types.jem) ||
                (file.endsWith(".jpm") && !this.types.jpm) ||
                !(file.endsWith(".json") || file.endsWith(".mcmeta") || file.endsWith(".jem") || file.endsWith(".jpm")) ||
                this.ignoreList.some(item => file.toLowerCase().includes(item))
              ) continue
              files.push(file)
            }

            this.total = files.length

            let beforeTotal = 0
            let afterTotal = 0

            for (const file of files) {
              if (this.cancelled) break
              const shortened = formatPath(file.slice(this.folder.length)).replace(/^\//, "")
              const before = (await fs.promises.stat(file)).size
              beforeTotal += before
              let data
              try {
                data = JSON.parse((await fs.promises.readFile(file, "utf-8")).trim())
              } catch (err) {
                outputLog.push(`Skipping \`${shortened}\` as it could not be read`)
                this.done++
                continue
              }
              if (data.credit === "Made with Blockbench") delete data.credit
              if (this.types.json && file.endsWith(".json")) {
                delete data.groups
                if (data.elements) {
                  for (const element of data.elements) {
                    for (const key in element) {
                      if (!elementKeys.includes(key)) delete element[key]
                    }
                    if (element.rotation) {
                      if (element.rotation.angle === 0) delete element.rotation
                      else {
                        if (element.rotation.rescale === false) delete element.rotation.rescale
                      }
                    }
                    if (element.faces) {
                      for (const [key, face] of Object.entries(element.faces)) {
                        for (const key in face) {
                          if (!faceKeys.includes(key)) delete face[key]
                        }
                        if (face.rotation === 0) delete face.rotation
                        if (face.tintindex === -1) delete face.tintindex
                        if (!Object.keys(face).length) delete element.faces[key]
                      }
                    }
                    if (element.shade) delete element.shade
                  }
                  data.elements = data.elements.filter(e => e.faces && Object.keys(e.faces).length)
                }
              }
              if (this.types.mcmeta && file.endsWith(".mcmeta")) {
                if (file.endsWith(".png.mcmeta")) {
                  if (!fs.existsSync(file.slice(0, -7))) {
                    fs.rmSync(file)
                    outputLog.push(`\`${shortened}\`\nBefore: ${formatBytes(before)}\nAfter: 0 B`)
                    this.done++
                    continue
                  }
                }
                for (const key in data) {
                  if (!mcmetaKeys.includes(key)) delete data[key]
                }
                if (data.pack) {
                  for (const key in data.pack) {
                    if (!(key === "pack_format" || key === "supported_formats" || key === "description")) delete data.pack[key]
                  }
                } else if (data.animation) {
                  for (const key in data.animation) {
                    if (!animationKeys.includes(key)) delete data.animation[key]
                  }
                  if (data.animation.interpolate === false) delete data.animation.interpolate
                  if (data.animation.frametime === 1) delete data.animation.frametime
                  if (data.animation.width && !data.animation.height) {
                    const img = await loadImage(file.slice(0, -7))
                    if (data.animation.width === img.height) delete data.animation.width
                  }
                  if (data.animation.height && !data.animation.width) {
                    const img = await loadImage(file.slice(0, -7))
                    if (data.animation.height === img.width) delete data.animation.height
                  }
                  if (data.animation.frames) {
                    const frametime = data.animation.frametime ?? 1
                    data.animation.frames = data.animation.frames.map(e => {
                      if (e.time === frametime) return e.index
                      return e
                    })
                    if (data.animation.frames.every((e, i) => e === i)) {
                      const img = await loadImage(file.slice(0, -7))
                      if (data.animation.frames.length === img.height / img.width) delete data.animation.frames
                    } else {
                      const times = new Map
                      data.animation.frames.forEach(e => {
                        if (typeof e === "number") {
                          times.set(frametime, (times.get(frametime) ?? 0) + 1)
                        } else {
                          times.set(e.time, (times.get(e.time) ?? 0) + 1)
                        }
                      })
                      const largest = Array.from(times).reduce((a, e) => {
                        if (a[1] > e[1]) return a
                        return e
                      }, [1, 0])
                      if (frametime !== largest[0]) {
                        data.animation.frametime = largest[0]
                        data.animation.frames = data.animation.frames.map(e => {
                          if (typeof e === "number") return {
                            index: e,
                            time: frametime
                          }
                          if (e.time === largest[0]) return e.index
                          return e
                        })
                      }
                    }
                  }
                }
              }
              if (this.types.jem && file.endsWith(".jem")) {
                for (const key in data) {
                  if (!jemKeys.includes(key)) delete data[key]
                }
                if (data.models) {
                  for (const model of data.models) {
                    for (const key in model) {
                      if (!modelKeys.includes(key)) delete model[key]
                    }
                    if (!model.animations?.length) delete model.animations
                    processPart(model, true)
                  }
                  data.models = data.models.map(e => {
                    if (e.boxes || e.submodel || e.submodels || e.model || e.sprites) return e
                    return { part: e.part }
                  })
                  if (!data.models.length) {
                    for (const key in data) delete data[key]
                  }
                }
              }
              if (this.types.jpm && file.endsWith(".jpm")) {
                processPart(data)
              }
              await fs.promises.writeFile(file, JSON.stringify(data), "utf-8")
              const after = (await fs.promises.stat(file)).size
              afterTotal += after
              outputLog.push(`\`${shortened}\`\nBefore: ${formatBytes(before)}\nAfter: ${formatBytes(after)}`)
              this.done++
            }
            this.total = this.done
            outputLog.push(`Compressed ${this.total} files\nBefore: ${formatBytes(beforeTotal)}\nAfter: ${formatBytes(afterTotal)}\nSaved: ${formatBytes(beforeTotal - afterTotal)}`)
            this.status.processing = false
            this.status.finished = true
          }
        },
        template: `
          <div v-if="!status.processing && !status.finished">
            <h3>Folder to Optimise:</h3>
            <folder-selector v-model="folder">the folder to optimise the JSON of</folder-selector>
            <div class="row">
              <div>
                <checkbox-row v-model="types.json">Optimise <code>.json</code> files</checkbox-row>
                <checkbox-row v-model="types.mcmeta">Optimise <code>.mcmeta</code> files</checkbox-row>
                <checkbox-row v-model="types.jem">Optimise <code>.jem</code> files</checkbox-row>
                <checkbox-row v-model="types.jpm">Optimise <code>.jpm</code> files</checkbox-row>
              </div>
              <div class="spacer"></div>
              <ignore-list v-model="ignoreList" />
            </div>
            <button :disabled="!folder" @click="execute">Optimise</button>
          </div>
          <div v-else>
            <progress-bar :done="done" :total="total" />
            <output-log v-model="outputLog" />
            <button v-if="status.processing" @click="cancelled = true">Cancel</button>
            <button v-else @click="status.finished = false">Done</button>
          </div>
        `
      }
    },
    citOptimiser: {
      name: "CIT Optimiser",
      tagline: "Optimise the OptiFine CIT properties files in a folder.",
      description: "CIT Optimiser is a tool that will go through all properties files in an OptiFine CIT folder and optimise them to be as small as possible, removing any unnecessary data.",
      info: `
        <h3>Changes that CIT Optimiser makes:</h3>
        <ul>
          <li>Removes the <code>type=item</code> property</li>
          <li>Replaces <code>matchItems</code> with <code>items</code></li>
          <li>Removes the <code>type=item</code> property</li>
          <li>Removes the <code>minecraft:</code> prefix</li>
          <li>Removes blank lines</li>
        </ul>
      `,
      component: {
        data: {
          folder: null,
          ignoreList: [],
          outputLog,
          done: 0,
          total: null,
          cancelled: false
        },
        methods: {
          async execute() {
            if (!(await confirm("Run CIT Optimiser?", `Are you sure you want to run CIT Optimiser over the following folder:\n<code>${formatPath(this.folder)}</code>\n\nMake a backup first if you would like to keep an un-optimised version of the folder.`))) return
            outputLog.length = 0
            this.status.finished = false
            this.status.processing = true
            this.done = 0
            this.total = null
            this.cancelled = false

            const files = []
            for await (const file of getFiles(this.folder)) {
              if (
                !file.endsWith(".properties") ||
                this.ignoreList.some(item => file.toLowerCase().includes(item))
              ) continue
              files.push(file)
            }

            this.total = files.length

            let beforeTotal = 0
            let afterTotal = 0

            for (const file of files) {
              if (this.cancelled) break
              const shortened = formatPath(file.slice(this.folder.length)).replace(/^\//, "")
              const before = (await fs.promises.stat(file)).size
              beforeTotal += before
              let data
              try {
                data = (await fs.promises.readFile(file, "utf-8")).trim()
              } catch (err) {
                outputLog.push(`Skipping \`${shortened}\` as it could not be read`)
                this.done++
                continue
              }
              data = data.replace(/(type=item\n?|minecraft:)/g, "")
              data = data.replace(/matchItems/g, "items")
              data = data.replace(/\n{2,}/g, "\n")
              await fs.promises.writeFile(file, data, "utf-8")
              const after = (await fs.promises.stat(file)).size
              afterTotal += after
              outputLog.push(`\`${shortened}\`\nBefore: ${formatBytes(before)}\nAfter: ${formatBytes(after)}`)
              this.done++
            }
            this.total = this.done
            outputLog.push(`Compressed ${this.total} files\nBefore: ${formatBytes(beforeTotal)}\nAfter: ${formatBytes(afterTotal)}\nSaved: ${formatBytes(beforeTotal - afterTotal)}`)
            this.status.processing = false
            this.status.finished = true
          }
        },
        template: `
          <div v-if="!status.processing && !status.finished">
            <h3>Folder to Optimise:</h3>
            <folder-selector v-model="folder">the folder to optimise the CIT properties of</folder-selector>
            <ignore-list v-model="ignoreList" style="align-self: flex-start;" />
            <button :disabled="!folder" @click="execute">Optimise</button>
          </div>
          <div v-else>
            <progress-bar :done="done" :total="total" />
            <output-log v-model="outputLog" />
            <button v-if="status.processing" @click="cancelled = true">Cancel</button>
            <button v-else @click="status.finished = false">Done</button>
          </div>
        `
      }
    },
    packCreator: {
      name: "Pack Creator",
      tagline: "Create template resource packs and get the vanilla assets.",
      description: "Pack Creator is a tool that allows you to create template resource packs, as well as get the vanilla textures, models, sounds, etc…",
      component: {
        data: {
          folder: null,
          name: "",
          description: "",
          attemptedStart: false,
          assets: false,
          objects: false,
          create: {
            blockstates: false,
            models: false,
            optifine: false,
            textures: false,
            sounds: false,
            emissive: false
          },
          cancelled: false,
          outputLog,
          version: "",
          done: 0,
          total: null
        },
        created() {
          this.folder = formatPath(path.join(settings.minecraft_directory.value, "resourcepacks"))
        },
        methods: {
          async execute() {
            this.name = this.name.trim()
            this.description = this.description.trim()
            if (!this.name) {
              return this.attemptedStart = true
            }
            outputLog.length = 0
            this.done = 0
            this.total = 0
            if (invalidDirPattern.test(this.name)) {
              outputLog.push(`The name cannot include the following characters: \`\\\/:*?"<>|\uE000\``)
              this.status.finished = true
              return
            }
            if (!await exists(this.folder)) {
              this.status.finished = true
              outputLog.push(`The folder \`${formatPath(this.folder)}\` was not found`)
              return
            }
            const folder = path.join(this.folder, this.name)
            if (await exists(folder)) {
              outputLog.push(`The resource pack \`${formatPath(this.folder)}/${this.name}\` already exists`)
              this.status.finished = true
              return
            }
            this.total = Object.values(this.create).filter(e => e).length + 3
            this.cancelled = false
            this.status.finished = false
            this.status.processing = true
            await fs.promises.mkdir(path.join(folder, "assets/minecraft"), { recursive: true })
            this.done++
            outputLog.push(`Created pack directory \`${formatPath(folder)}\``)
            const jar = await getVersionJar(this.version)
            if (this.create.blockstates) {
              await fs.promises.mkdir(path.join(folder, "assets/minecraft/blockstates"), { recursive: true })
              outputLog.push("Created folder `assets/minecraft/blockstates`")
              this.done++
            }
            if (this.create.models) {
              await fs.promises.mkdir(path.join(folder, "assets/minecraft/models"), { recursive: true })
              outputLog.push("Created folder `assets/minecraft/models`")
              this.done++
            }
            if (this.create.optifine) {
              await fs.promises.mkdir(path.join(folder, "assets/minecraft/optifine"), { recursive: true })
              outputLog.push("Created folder `assets/minecraft/optifine`")
              this.done++
            }
            if (this.create.textures) {
              await fs.promises.mkdir(path.join(folder, "assets/minecraft/textures"), { recursive: true })
              outputLog.push("Created folder `assets/minecraft/textures`")
              this.done++
            }
            if (this.create.sounds) {
              await fs.promises.mkdir(path.join(folder, "assets/minecraft/sounds"), { recursive: true })
              outputLog.push("Created folder `assets/minecraft/sounds`")
              this.done++
            }
            if (this.create.emissive) {
              await fs.promises.writeFile(path.join(folder, "assets/minecraft/optifine/emissive.properties"), "suffix.emissive=_e", "utf-8")
              outputLog.push("Created file `assets/minecraft/optifine/emissive.properties`")
              this.done++
            }
            if (this.assets) {
              outputLog.push("Extracting vanilla assets…")
              const entries = Object.entries(jar.files)
              let totalAssets = entries.length
              let objectsEntries
              if (this.objects) {
                const assetsIndex = await getVersionAssetsIndex(this.version)
                objectsEntries = Object.entries(assetsIndex.objects)
                totalAssets += objectsEntries.length
              }
              this.total += totalAssets
              const paths = new Set
              for (const [file, data] of entries) {
                paths.add(path.join(folder, path.dirname(file)))
              }
              for (const path of paths) {
                await fs.promises.mkdir(path, { recursive: true })
              }
              for (let i = 0; i < entries.length; i += 256) {
                if (this.cancelled) {
                  this.status.finished = true
                  this.status.processing = false
                  outputLog.push("Cancelled")
                  this.total = this.done
                  return
                }
                const files = []
                for (const [file, data] of entries.slice(i, i + 256)) {
                  if (file === "version.json" || file === "pack.mcmeta") {
                    this.done++
                    continue
                  }
                  files.push(new Promise(async fulfil => {
                    await fs.promises.writeFile(path.join(folder, file), data.content)
                    outputLog.push(`Extracted \`${file}\``)
                    this.done++
                    fulfil()
                  }))
                }
                await Promise.all(files)
              }
              outputLog.push("Extracted vanilla assets")
              if (this.objects) {
                outputLog.push("Extracting objects…")
                const version = getVersion(this.version)
                let root
                if (Date.parse(version.releaseTime) >= 1403106748000 || version.data.assets === "1.7.10") {
                  root = "assets"
                } else {
                  root = "assets/minecraft"
                }
                const paths = new Set
                for (const [file, data] of objectsEntries) {
                  if (file.startsWith("icons/")) continue
                  paths.add(path.join(folder, root, path.dirname(file)))
                }
                for (const path of paths) {
                  await fs.promises.mkdir(path, { recursive: true })
                }
                cacheDirectory()
                for (let i = 0; i < objectsEntries.length; i += 256) {
                  if (this.cancelled) {
                    this.status.finished = true
                    this.status.processing = false
                    outputLog.push("Cancelled")
                    this.total = this.done
                    return
                  }
                  const files = []
                  for (const [file, data] of objectsEntries.slice(i, i + 256)) {
                    if (file === "pack.mcmeta" || file.startsWith("icons/")) {
                      this.done++
                      continue
                    }
                    files.push(new Promise(async fulfil => {
                      const objectPath = `${data.hash.slice(0, 2)}/${data.hash}`
                      const packPath = path.join(this.folder, this.name, root, file)
                      const vanillaObjectPath = path.join(settings.minecraft_directory.value, "assets", "objects", objectPath)
                      if (await exists(vanillaObjectPath)) {
                        await fs.promises.copyFile(vanillaObjectPath, packPath)
                        outputLog.push(`Extracted \`${root}/${file}\``)
                      } else {
                        const cacheObjectPath = path.join(settings.cache_directory.value, "objects", objectPath)
                        if (await exists(cacheObjectPath)) {
                          await fs.promises.copyFile(cacheObjectPath, packPath)
                          outputLog.push(`Extracted \`${root}/${file}\``)
                        } else {
                          const object = new Uint8Array(await fetch(`https://resources.download.minecraft.net/${objectPath}`).then(e => e.arrayBuffer()))
                          await fs.promises.mkdir(path.dirname(cacheObjectPath), { recursive: true })
                          await fs.promises.writeFile(cacheObjectPath, object)
                          await fs.promises.writeFile(packPath, object)
                          outputLog.push(`Downloaded \`${root}/${file}\``)
                        }
                      }
                      this.done++
                      fulfil()
                    }))
                  }
                  await Promise.all(files)
                }
                outputLog.push("Extracted objects")
              }
            }
            let packFormat
            if (jar.files["version.json"]) {
              const data = JSON.parse(jar.files["version.json"].content)
              if (typeof data.pack_version === "number") {
                packFormat = data.pack_version
              } else {
                packFormat = data.pack_version.resource
              }
            } else if (jar.files["pack.mcmeta"]) {
              packFormat = JSON.parse(jar.files["pack.mcmeta"].content).pack.pack_format
            } else if (this.version.startsWith("1.9") || this.version.startsWith("1.10") || this.version.startsWith("15w")) {
              packFormat = 2
            } else if (this.version.startsWith("1.11") || this.version.startsWith("1.12") || this.version.startsWith("16w") || this.version.startsWith("17w")) {
              packFormat = 3
            } else {
              packFormat = 1
            }
            await fs.promises.writeFile(path.join(folder, "pack.mcmeta"), JSON.stringify({
              "pack": {
                "pack_format": packFormat,
                "description": this.description || "Template Resource Pack"
              }
            }, null, 2), "utf-8")
            outputLog.push("Created file `pack.mcmeta`")
            this.done++
            if (!await exists(path.join(folder, "pack.png"))) {
              await fs.promises.writeFile(path.join(folder, "pack.png"), "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAAuEklEQVR42sV92bMsyXlX5VZbr2e9+507d+5IMxppPLLxKtsyiwOHieCdV/4CCBy8EPDEA2/wBkE4DJgIQPBgsLEAhU3YAmHZsoSW0Yw0+3aXs3af7q49F77M7HOmb1d3VdZ4IsjpOdHVt7Iy8/t9+5dVhf7p7/868nSTSpVCcim9lVbmPEtKISRCyNvSlPK4hO7eVYNTd8fRtf2YUSylUmq9C8bIU16aV9N5XnKBrjoij/kYPgjpy7o3GCNNeVEI6LVxpvZ33ydhSNfWIlT7WNK01V8CSoa9MPIZMqTbMCIsE5ZDCCWk4cron/3+r2vSSynkhusghISQRVblWaWkgsO1VQkJC9hMkcCn+zvR7igkGIlLfOwV8qKaJ0VWcGXQqsPDfERZNxjgZM5VlvGyXIXBXkGTPggIodjbOFtNRE9tWYjcxER25iGjwzgIN8FACWaEYIRU87T/yX/561xKfbntC4P/RSXztCxybtZWJ/2WqSsvDtnBbrQzDDBGSgHp+cUiz3LueWtwrq8PU+T7mFDkOTd7vaqSWSaqSthFUYqDgDKGLRiXrR2GOunrzf4rAAAwgDTYXwjGjGrau3AP+se/86vOa0Oci3ReZrkQUv/S3ixfKK/f8/fHISCdZKWVJKe+UgEA/T4zZFDIQ45TRQgBDItFFYYUeF/p5qzNPMNbQrj3sZcHAHb64TAKAQDlufYmf/VvPXAkpaGkR32t1aRUwvB/a1+EEEaIV2I+z/OcY4yMXDotKQzo/qg3jCOfUvjB2CeEHBgF2D9POTeKFSE7oiv1FbS2YeqjMoK1wTOThMEoITCuC6OQn/sbtwlARnEz6TXFL8WRUhRGlFIMGMDvDQMhQBgpjDxsBoPunEvdBSOsf9pKem0/RvHeKIYvcEwJCZlPMZFKCWVg2LIezlW6qJJ5xSs9VyFUVQrBpQvwUnl2iUu+wQhaK1MSgmKfxiGjhoZciAwG56IZBoy0XUzykvz0r90qC64XSQkMWR9Ar3mTmaeMhJHuIriFAdVJXyeyJQrneqXYwPC0hKkr0gP7q6cNIyMkYgz+CqVdBk2kK9JjJIQm/WJeVqU0YHxsFQRXZXEFg+5WJ31N47TAoJR2FkKfAOkZxatd0Mcw8DoM9ntS8ousKCpOfuFv3oVjYJOqEIasesAV0rfoMhaQIIQBNAzGPtdJX1/VJQyVNv52hdCZUbI36u2PV0lfb1YaGCAvpG4IIylUllSLWQWrQN4aueowKEwwIaiB9M0wwOkIWdJTn5EtXSwM0sCgZ0VhUMNtmSF9VlTKnvb3/uWXVsWfMhL1GKa4xXDV3SQu85SXOYeruCtQq2+jmO7v9ka9EGMkpdOoGCGpVF5V5xfpxTS3/Og4IpwcxSzu+5WouX8OFsI36p4SBMcuc7WA+ZQwTCupSi5WB10FwAqz/ksp9kNCCIJTXQaBTnipggUwY1EI6NUCg1ri3eszgJxRElIaUGqlwY0cyjqds0U+uciqSiDdWlwy5IFb5Q+Hke+TohJZWXEu250CQ8iA0ThgvvZBZCWEkNLVexQyTau85IyC3Pi+v1zmCgBWxNBTYQZl2A8IbvRnkUVtzRMvZZpoXbzNTVLav8S9vg8fDDBDs3hoLd8Og7JtOaKee8nl9CKdznJuFP02hz3uBeNRGIbMDmdHySsOCsFG+9tIzyjpBSzQCkd3secJJbmQDTAghACqLOd5weGsy7hSXy0yMBgV9Ju/aEm/xc54jBEWENN5M+nrzaxEK9w0qbhhzDXSx33W6/mkpujsV0ZwxFhAYbXrMFwitdHZ9cpKgChMZ5kQ2sKvkj6K2GgUxbEP39e03BKGkmflGgyWJzBwfcg28EQNhto1C55lXNQcxSUMjISBj37jt37Ja2xWvYIoXOYGmkhfn0Shs0mVCRoUIUB6P+4x2mhj7M8+IbGvfZ4rureaJauCipJPphnoJSE1qwYBBdL3egFC66TfBoPtiBGKAhr5DNdIX4eBS4Bh6S2aOYg0483Kzar3GgCNDm8QEkqNN+2eosFISe0gQq/BKGgmfT3Z4lPtehKEaozf4rTkRXV0uggjNh5F8KO7bYdRZ0khhdwZRqitY10aQJvNF6XJMDrF+9hzaxhrMytKyUuhBADnSAutcyRXjGJGiTQRgytyGnUdqpzOkovUsLNu7SMio4vmaVFJTY4kLR19JIw1zOBTnT5KTh4mJ8dJVUnrxLc3ZDxaCeDTEPQ7tYLb2s1BAmB4ghF5mu8JxfDBeOsYy4QdV6IyocSVGFEQI8p8bA6bY295hZaN2kLG4kBHAHC4ETATjklIcU/mmbXGSwMQsuEggr/wfWNfC89iXpyepMmitK4LjO77ZHcv2tuLqPF8Nk4YGdJzIblQq9qsrHiWlwBhc8IG/YN//yu8UoLLNtLXGtIwUFpLGpuzpdCktxSsE5cyrLUZszBsIX2tGRhw7LMoWNfLNoC4AH90lpU1f/TSDvvjYRT6VK3AgLC23mlSnZ4k81lhZWUtBxOGFDAY74T06fKGJQuXitdSBTUYhFfTSAQjrVz/0X/8yzZKBKykUK2kr4NkpcFeXTWQvlYeMTBQQm3g3UR6aGueSeQz+CDd9C+gtYH0ecmRWWhDQBRH/nAQ2mAbYy/P+dmJDuWk1ELWkFcPAwtDRKmJFpUlvarRvgkGOLSo+xTb3BT6h1/RANg580qnriiBE1pIXxdhwjB0ENyg6NYsDMwnfkjgsCbjLTAwooMazsX5RZblFXKzetJ48eAUjQbh5DSbnGdSKEyQy4hSekFADg56o3FYCSnc7Zn1yyuRpIV2KVdEH1+ZcGmSM6LSNtP82KkGIkB+5/MCrmB/ce9bVHKR8LxWTWxdEldyURSLohTKBl9unY2SAfACyiKd5ybWwXUlI/IKwZNShwydK0WlLFJRZIJzdfWjVkFSqDKXlV6IZzkfE8RMNQp5bWZWKs6FEOqpUhzF2KEepOAchFYvyCiixGqVNlfnMjtm/5Qlz00x0vyylfeh06AX7o1j37cqSFcOzs/S09PE1iq29pWKMTzcCXpD39obM5C1IKg1NMmyanaRFwX3vOWc/YBEEaUMob//r3+ZF0JuqnARA0M9I4TQ0jpVlvSbGjP22ZjKFtLXieszRLCFoYH0deb0yoKnWWWkcJPaiYO9cS+6zENcdbQwnJwkpycL+IL1rJ+uyhE0GAeDkU9MyWWVFA0wWJUIPAGkT9NqrQRrxV0nkv/OP/9Ss+BTipmPDEevkl4KIVvljlFCCTa9aqRvMyo+RSYKvuyLlonrdotXiDQrBZf2ELqD4d0dx/048JQGY1vsBhwKonB2mlgYLMl6AwaMzxrrmnUYMEZcyMWsWCwKWyzZagX/7r/4kosKAxgoQ9rhtaR3bqYioS0+fIOPcu9pRZAaacA1A+uSAskqRsnOMB70w3oeYhsMWaZd0uk0YwEe7QZBSGvppxYYAGYIJrRF5LI1AKQuvorleqJDWcFNxOBcRtZRM/NR1GcllxVXXfY4LAuKlOiCgQ1TPeU0qJFuqjwUB6xG/RY/J47Z4fW+JIIyXKO+wxU8wSuVpEYE28nULAG2Cs9QGBE/IFebPoy5a4bBTlrnjiDrGQQ2r6kVV15IIdqUkA3lpFRcQbPWMghtBRQ3k8OqO5gk5/IqxT3o+f0oaK72LNPaYJNn6cU8s0EDpTgKmV67mX837y4XyVyXRloi4d/4zV/SuAlVo6ApvseW9Ppw9eplITKd7auT0p6pg/hePwhDasFYpQ6Al5eyoZqvpJJCwt/1pCxBoYZhc7XAXpwbOYO+a2WsgJFBHMShjxGqmwFiVPZ0nk1mqdUba3njOGKwIq8TDFhPCGCAMnVZbIiEkQ0af+1vP/fsS3uDnZBzu2absdFcH4SW9FsZrcg1DIaUK9P1CZScgPTbpmsUgk7YAhIw4FrOQNppbGl2blFEV9lCf7kK5rf0tRX/0Kd6P2Hw8UY2KxazBGpqaVFyBPhsCRgtDPBX/9ApGaxUnvJkUV1VqKxDwSs5O8vQCz+3E8Ts2Zd27724ywKipAos6bGn2mztsuKTcUBCKZgijnssipgetd3i6RiiKGRZWdgN17tF0TabFMV0mU2SmvTCoa+lXBgwqD8DGECIRVqcTZNaIN20uxQWSAn2ujQLc55pGOALfJJpcXGWVaVAn//lfaWDKTncDV/62WvPv7yHCbJYuW9DK0wkMRjYIKWbruRcpQBhxu0vjs0mxcajwA/oLCn0Ip06r25roJyLeZKrLn2tuOtsUkjtSt2bZZcP37o4fjgvcm5jNA3A1XYdjLxb94ef//nrB7f7Llkdq0zgTBNbI2pSzXSZXHOkxZIvAfKsoYRU26oU+GR/HO8OIoTRPCsm8zyvuEs2SCsfvVjJTfoYd1Eo0hSHh31tSzTFpOSGERxzZRen+et/fnzyaLF3M7qcqAFg9TxRSTj1wct7n/uZw/4oqKpVjVy3eGZvj3paSAMShqQ1FWFdlHWjUgiQ0wY3SUjlU7w7ivZGMWPYLn+Zi06KaWI2u0NryJ2ITfvAlW7NpCcYD3oBRHOE6OEslqoFBpv0JSDfb/3g7M3vn+Yph2TGwa0ITt8MwJKypYDzXvzpwwc/sc98otPZajPp6+3KawyWdrKZ9HWjovKcg4SuZUdsunh3GO3v6P2KcAhtzYmshJwmxcVCd4bDGnhSiBqh22Cw+qoX+YN+wGg9Hl6FQaz9EzUs8sEb0x9952R2llsVFA/YzvVISbUVANNMWp/LvRu9l790/dZzI5Pol7bIxU1l0aWGHEbUXyl+wd92iUf6PyG0RioLYb0XmNSoHx7sxHHEpGzAT8NQVGKS5GAYbPbN8q8QNQepDQY72TBgMHQQ0AYhWSnO6HGsx0wIOnmUvPat46MPFnAIH+svuAJgm62U3X5+DIZhvB9p/cA7WB7rGgEMhCKlebZj/pbLLOEBJYd7PeBBx9q6NW55yc/n2SwtORde52brDWikK2j1QmYjDEgblul5Blz/wRsTwRVleDXE6Y388WG4GQCENhevq1L4Ibn/hf3nvrAf9RivRNt86k40DhwMQz0+gj4RW9YgNRk69k3y6vH5fJZ2cJP0ONIrU0E8tH8Qx31mFaML+SnBnMtHH1x8708enx9lZj/VuhM13A1Ge4F0BmAVPAVm+cHLB3c+MyYU80p2EgWMPd+/iqvbuZhhTDC+OjlgNGTrqYgGRaT7LsNRb7LIHp8vAAxc95PqnkUhq0wosTRVvb6/ux/3eqxZ/gjBcP7J48V7b51DEnR6lBeZQHoK3QHYuiqKpFDw2b0ef/anrh3e7gMmtfCn3TAABsyHYbbF2IhiTLE5oW7bGalvUqszfv1HIdXpLD2aaD9pQ1bbHIpSk15WykNrjr/eTrp3EIfRhtwcxlq/X0zyd984OztO7P0gZ4/TPOF1AJRUo4NwMPY/BuClX9qDPo4AXBkGhNGt+6MHrxyO9kKuXdVuMFC63ONlDlfq+whTQjD82GzbGfXpuiQtuR41iAXmQhxPk+OptgwYTrY236YxMgEAeFt2S1sfbDAMQBpg5so4AnZDQpbyD94+f/zhTHAJh5aHGgDYuRb2hgYAq59f+PldhO3+9yYAoBGGVhOlQHc/Ivdf2odUUhDRT2YYQBoIQZqsGDPNuki5dDf7RwEGRollX9JWq1nFOK/4k8nibJYJKaEPkJ7nlvQO96wRPBwBDFEQUqAA0P2DdyZZWq3dfnPyUWrvE9kKgFD6I5UGYFWUCGkCoO4qwCSGO+HzXzwEgQAgjdfUDYYopj2t3cmabDt6OzrjH/rQU7r2trKC5nn5/pPp2ZO0tiuiHQZm7jc++mgG3o6pF9nu7QAAzvvXDXhcWjG/AsAcYM2VCCFHAGyzGYvDO4PnXzkA82CxdSx42dI/DMkIoYYMyo30Uqms5PCBLuNeuD+IAkakasfQri6vqqziZtt+eX6aQcbYaVeLjVG4zNIyXZRVLq6QawcAaQ+VLdDoZogHyJMbK2LK2pwlczk2TDQLnD5anB8lt54bg6vaGwXCZJUb9DgLMKV6FMu8OecESw0HNoahsdxoSS+ksonos3kGueS9QbTbDxkx+YmGGyi5SMqy4MLqLqgXxbEPAJydplnalBO1zmiWlUVWWYUBn42j6IhYKvQ06UmJoilmc4wOr3RdTQKgUXZlkNcHIHTrDgxrRUycLIOI3v/83t3P7jCfGEFb92SYjxoeRkAw9k0lX6lNZSYus4JXQtrD9aoLJfvDeNwL8NOeu618cCmToswrXtf2y6rARXF+mhaFQLrVa/0cEJIwtG7aBIIEeGgDAIIrkACAQZMee1h4wYyEM4y4p4hHX6GoByi1ALAaGyNHAK7sjOBquB9CxHDjmaGHNCo2DqAMM79pS+/qDZHL+/zVZVQsZFrwUkhL0IaqSxyww2EMhsEmIS71VZWWul6zncE9Y8MUqPXJeW63EWJshKYUOXReudPEBQDrk/gJBsYnJVLWt8MGgLgZgPrMtJZ2BeAquQ30OLg9+MwrBzvXYqy7e+6RsM3RaxgwEVJlFS8uHz3guPkQjMLBMIp9llUVMD4X66RvgKEq5XSSzWdlkXMgfVnbtdcKwPGjFKdeNCUs02cYfeQGANF6eUt8xDDCW1XzRnMEs4Ret58bQSoJCj56JV2LGBgXlSprdQInX4XiYcz03Lp0tttVi4z/+NXT2Tz3jAzVz6kKwUtZBwATVKZi/lqhdY70FH6KrZCPAACPwfeOAFg2J1RzujsAts3P8iBiP/HLNz7zxQMWEJBoTzk5i1cSJxRgoDrV2hhBGC93tDNCfOqUAqFm79uH71y89p0jwOD6vb7t4gKApVuei+K08t9ACm+QaxQYAOgnAsASBP5gomFwBADOz+ZVkQoh5LU7/Ve+fOvuC2MbxzVtb/LQhiyNVBVXAAZqu52EEt1fPa3QAANGtsJgYiB8/Hjx+neOnny0gP5xj+3fitsBsKTXv8jUVN5x4YXvAvkdAEAeFOV3VxerZ4ibAFiN2hByBQAmh9CS6LAB4ItfvrV3M+bVetUTXaLctOdHqEpIqTacRIhHCcJbSKxMwBxQSsnTKRAAjGLIoP3oeyfvvXFuE8japwqpCwDQXXIgvS5ra1NBPLJA/vubFgGnDxF9mXrqY2tBtV9lYrmuGtbE5ZbudnXIsSr9zg/OHr518cJPH4JhgOR4ZU2cjWwbL2Jp4VNEMSmF5CvgEWxIj225bXs1WGp3iBAcaBSQmRIpC/H6q8dv/uA0TUo4pAy53TLvITNctqiyhEth4ydLnRZ6WE7KE1HknFrHEZqGoaOls09LsQmMJg2L1h8vIbj87h8/evfV85/48s3nTdVTlLJTAiNkWBBtGKBRggi2RHGctkxFGQbUp/Sjdy9++O2jyWlKKIZprJGp5VbAQmQLbiNeR8ohbKVHAmaCa8zoFaZGuSps03Jd0mqCKwkfqSnrqc1PiKvbcz8ki1n5v37nHYDhJ7986+b9kSmCusNg1DpDRnq6uVbYeBMnT5K3vn92+jgBkhjS1x/ZhS2vbgiJuZxPy3RebcZJbRUcSbxkwctUoMuOeD1XpBrkbqtsc64uTvLFpAAYnLWZTUiQJx/Ov/aVN77+u+/MJjmggt26q5WH7Sm9CuTuYpY5f/VPjr751fefvDcnFBOCutxppHXOxXlRZBxtor5CHuIe2jK6qGSZC2u0bcMt6LkRAxuvA4zt9CiD+XnOImk9P8Dsje+e/P6/ef07f/SwqoSpmrU82U2qGhe0waBNK1igV8/+9++99/b3z+AK1Med9p8BcrPzAlwdZYdH3UlFVilTB6BednVv1h8QanFegDRotwe72RS7m8jEB9/+o4+++ts/eusHp5hgyvAG0sOnJomtMBCqr3b84QK4/gffeJKnnPrOwdllimI+LUDt2Ntv6pzqDoDqfKd8dxiA+rALDJAQQrlrJGwMA+yY/OP//M7X/sOPjz5csIBc6QdLeufNCfjK2DCfzCf5t//woz/72oeT44z6y1KYe4E+nZcX57lVHa2wIeWhqotB6khf13lbXTk9zkEvtbiXdW718cN3Zv/j3/3o/3z1vWRespAohLpKJkKYMsJL+fq3jr/xX9+HC2pvjeIORp4gIPrsPIeFWDF1bcqF3g02QG0mvRJKas9pq1tWd3Wgy3xSJrOqq8AyX3sgr/350e/+q9e+8/VHgksWENQFRej+6N35n37twx9/+1gKaRWaO/XNrcsw+UIvuVMqCTe5IYrWAXC8uBH/IqnKzKYG66KxEZllgYILJUQ3+2INQ5GKP/vaB2Cf33vt3Kry1uoQpXhykn3v6w9f/9ZRnlTUJ84UtOEV6g3ZcNfHBG2Np7YoQ6xnSLB05jcMEy6QoZ7zbvJCFIvKROGd3AD7RAsdLnRqhGrDMDlO//A/vfkHX3kD3HY4xARty9eCunjtW0dAfcAADnEX0kMLYzLa9cOYdjWzMBIgTagZTjTZJrTyHSceDiY4mGLEkU1xORRV9TllyouEK6OROjUhFXfLSdfdmPd/PPnqb7/+zf/+fp5wP1xNRZltsEK++9o5OLKP3p0hhKCLXY6jcLMAD3cD4H37CLVOkkqgEzNYq7YEBrl0RoXnP0bhB1gjQnMUnWM/qUlcIwyykrnRSEsDhboEz1YjdTYMBKD7/jce/95v/fDVbz6xt0PZDPmT9+ff/qOHb//gjJcCwOg0GUxRf8SGOz5lSBkw3CWGUM34GCNXI2xL8+cI0qVsguDQsImBzp/jcIJxgRqwXivzW42UG42kTW6XENpqJCFVR3bTGgn0DDhI/+3f/ujhOxdgJwGSH/7pk3RWmpKRO+21wYz6FBg/iGid9A3lB1Nm8DTpKa6nPL1qq8ZHlRd+gILHCPFlrQavxtC4QqCOVFUbuFUjZZzNEeVIddVIwmaJu3XDZn/j8UeLP/jKm9/6nx+dP0kIxZh0uwgiKB74vQFD+BOEn6imc5waqB0yR2olWKQ1N9+4m3BOpxw18iiAl9IikkUoJEDd0YLBJWRHabAekRTK93GHfkqT3sgKRkbddyOiqt+72DE+wK1xgPTswiSXqwtDqClFa3k/yHB/Rv0CW2XXzZTVCm0uvbp6AdQnfkit6uhO+jbqI+0CId7BIrY9NN3lAUwWNawsDEiieEF6M9pZI1lnjmJnGDq7Un5Eid+d9J4lve3V1lt1uzh1GFsJ1U0jKaORAIMykEUkJO4MA7Q2jeTeFEBKGMEUdaWOh7rrnK48VwcQcVT/0e74xKqmWJo1Un6pkXTrrJHgU+O3zheiPmEhNdR372SVsKfgI7tNW/FuE+6UIVHBgsDH8zrAgCQKEyz5dm5WjffJ+JiFnZXGSioUAwBbutftx9VDBNQUMuq56Pz4tVRkk8qTcOxK0s68GaQ4nlJa4rVUhCKqAQYYaZs5kbI1I4SjHiGsGwsT+7wn1ALwGmBw8mJanj9O8wVvptxavgswS6ZVOheOWtPumRz3I7pBBYmGeZtwgaPogvAAFT0piap5nM7mxD1BRlAYE1hk1fa0G2RYGHWUGXNBVKR8MSmrQiDnGdpnBeSJWOYosVsIbTawjnsho4R2i7mIWZYZhhWYVLiMRRVKDzkYsxVzgqCHQ46y/uQiQnWKvyrlpofc2d1KXsdmdY5cTIvMcP0V6RFq1zllJotEWJ5AyNCGe2i7pZTmaZuj3vJhB3KrCkJu+l154YLEF5RUTWKAFEJy9YqrGqlbEgkaC3DYo/Tp4Athj9DO1LcMu7gozx5npnC0QnT9fcuikO4oOOgcns7sjiDHp4uoYRxc2+n1Ql+ZtskNhZUkSDFPhmZ01Q4DUD+aUswQIp7dPu+ukfSH1s532RcUYU61tURmd4UjimuKu0rFYlKUmUDIWSsSnc8pZjIpKyWdwkBlVjnqRbvDSEppGb/JC0LcY6eInSMk1v9d4c0YwCCBR3YGcRQwM2QHairZwEGNt0sybRiojxDuRHpDxNKj73vFR7zQaUQ3/LD5nCv0uhQnQqEtTpREq5MWUhKC793YffHZw34cGDlodUORuVCC2DEmi6fLNbiJUgShQRyOtG3BHatfdstYx/qqcgG4RkTl4SOPvqnwmTJy4IqZl3vobYnekl6qGuiA1MfqXkq1P+q9dP/6jf2hBkOILnEA1u4QnSB2glFpTkRuLxliFLwrQBvW1h2GTpFkZ8bHc4++pchD5Ql96NSI8QwfSfS68M4M6XE7HYSQoU+fv7v//J39kFE4tE8ZdgCgLgqF559gOkWebDgdyUurYv/Ggb/TB1PP9KFqdAx0z+75te46h7yvyDsKpfrQLk1R1VT7wEifeaHQj6T34QpmyKhitXU5cO2bB8OXnr2+N+oJ2fJ4dazckhtkhvxjjDgytFQbTc3aISFo2AvB+FBcG8VZI3VvDTrHVmId80e6roLekegN6SXKYNZiCz3NomrIghfvXXvmxi4hWAjZpA9t1MIIVsptJYUMqn54cBdRpqRw0b/2rcI7/SgW1IND1B0Gz51qm0ziAkjfTedYZetPkdY5x8pxdIAESS8+w7f94XAYig2vIFy/wwcjVHGJtb6OfCd9bcjn93fi68/5w33dQUkHGPQawpwMZpRVWGOAOvCvKpR4T6hsyYMda+WInHlo4Tn2tbqFZCh+RMIj7HEnzBTSnyDFo2MazYl1Ol02+c7S4niaaHBBVY/BaDLajIHWPpJLwREh4d6t6No9GsRaFJaqv3mWinDUW5BeQrBECnUJv+dKvC3kY+nOxZggYurD7tJjWTg8xUB9mtqqYRPRr3oRjoZnZHBG4AuMxSjZTAu1zP+Y5/Pyk2kyWWTLZJy9x2HUj0Bl47ZX2OkraZQFBcm5dj/cveFhrMuYpjWlIqwAFTpBHeTYLsNdj8sjCTCoiWz2QxBGhHWsDyP9YXPU+4gEE2zI2sbyWNnJRzM8PqZ+iq0cNDwWSlkiKAV0B8YvKm7PxKv6OvTZziCKAuZyt4ndY+WPDns3nqPxqKGDhh1rKl4lMOKU9Be2ZNbBk1GlEh/IbRrJZkBrNxm26xxcougxiZ8QVCGFnRKZ0lN+gUYntDclmiGx0wqyojqaLEDzrCZi8Xp62gRTkKijZEMwVbsFS4sCpkF0+Ey4f8vzupXM+nMKSGgQsDMM2FOzVY1U0znOTZNReuEZ7j0kLEHKLQSpuAAG3cmCwQmhpe5Vz8VuZEEu5NksrbhcExG8NZgaRDZjtwqDkkLVMiCGIRSJBp2SYZb3wwLHE6Km1tnoppH421xOJELddY6SSko23IunUXiKPOnCwvapl/LZm7t/5YvP7XgmqYA2EJpu8SptnAQnOAViyly8HwXj/vJ97i4xv+q6UcZqJOHJh1J+IFVuFIt7bqDQHbGn7VoXvueYhf07L/TvfI4oqpBqHdE8eF8M4/AXX773Cy89EzCSlhX6lMJF3Dwwo2TUDwfLvILXubkrloWS70r5RKuFDhqpC+ImdkHh/t3B/Vf88TWAQjl0tg+ZeOnZa3/tpx7cORxz+/aq7iVu3VFLgBMAtXfQ6byCfV6tMMv4JEUPF8WiTjQMauZ02517s24b640H974Q33gOEapE+yrsW4qu7fRB57zy4CYlGA6bByEYU0JU0+NgnQGo5xVAFIZx4EmBEO5Ogg6ujvxQyo+kVzbPzp3xOaKsd/P5/r0v0HikBPeUE+MDw/3Mi3d+5ZX7e6O4guOVN2JuI7F5ilMHrmgBoO7+hIyW5w/L2amHUA0GrDDdRmifEfvcHleNdKHEuwIEAnqpLnqmfldPsHNjeP+VYO+WljApXLxMIdXtg9Gv/qUHn7m9D534SkrHvDaaV5VAHlpLusShvz+K8SZlDSeXT+/KlyZJczju4c6FJCnys4fZ0XuizBAmLjkzKSVEec9c34kDJqVyTT1JD0yCeiR9SlRXCJCu9amJjIcPendfwDRQgrdewz5bHSb5mTv7L9477IW+pppqB4wStDfs7Q97PtUEUY2VCesLQX7sYNTzGcXd7QmAgHm2SJ+8U0yP4HouUgejRgG7e318bbdPMJLSVRS8whtF4bAXEBOiu+72E554i1ff5xj3lpFTW7NPoLt9OPrcs9d2hrHLw77tfAZRAHaiFzIr36hRhUgT7V4b90CZN+0Lal2oIboqJk/SJ+8CGK2ioJaOsAf69JkbO8N+aA6dYICZRyZEb693Ym1F5LGsvlOJ94VZhtx6WcnhY190I6Qc90Mg/d3rOxhjIdsq2zZaohQKXruDCOM27WoUF8Le3iA+GPcoJXB+095QRvQkhFT1zAZaFQZMZJmCOmKDXX983cMMeekmvxpJKa8YjVFya38Iru3pZFFUwmUrrrwM0UNfLLKi4kITqG7AF9pyyBOpD2m7e29J7/sMNP7BTt86i1dPO96mAPTwUlqXZO2dTBths9ERJfj6Tj9gdA0qvNH96kX+3cNx5FP4XmN9XH/+B5jl9MnbvMzg0HGXAGgVEAUQCMcivrqMS0z+PECrGoloRoccUfV/K0194pbB18ldBXSH0tW1vQFc3eFVexpZbiq9kK2xnLF6yfrLFuEHIdTZRcK58JllfIeiPGAMGNy7vgPyshymsRlRyGWRNSui+tOYD3f7EN1Qgju5bnHog0YKfGof1CHPZfXdChJEzvlqpMyMH9zefXB7P2BEOARX9lGYxxfpLC1Cn7bTxLQkK08g/5mX2/iMNr8uCHYRDWL/yDz7HenW4WYJx5JZFDJGMBc1rdIS8qBRLyylEG8JOVVa1VPn3VhK+ovHYXE23ulLB9fYrnuRl5Mk48KKYvNabbVLzBZ5XlaoRjiXXNDyr5DaAN69NgZDjzGybNugqT9ZlNq92zIa8jHxzpVrQKlDCkLKeTR5K1g88ZQL8e17UcXxRXKi1YgiWg62esUYmqH1Ii1OpwtL/fZcUN2eCfHx5GzW72Ac37s+Bmlo8F5aKjnw+bSbeyipEEGSh/MPo+m7hGcKt6T9yKU6nyUFvPwBaGn5uMliaZ9SlVycTZMLXe3yXGQaTxdZWbWIvzLeS8DoncPRM4djRikXsivD/n9rCMOH5WfA+Cw7VVoO2kEDAArOn0yT03kqjA/WmulD1K9o//R8VlbcXZ3qBNNFki+yp8o0G9lcGT8BIqmffP4m/K3teGn3fLZ4aYgQ1B0gN8cJYVRl4cU74exDJCuFyOoTz6CpLRp8luXA+KBDsEtEIDgd7Pce/KzX35fWmDm35fVTsDDzzEJnkzbb3nbKzZ6vl5659rlnDkL2lCgo1fTayNmiKEpeN0jIAv9pNxiRYBzlp8D4tJir2qa75kHzUmysn9QqVBwRGt7+XPzsT5F4qKrM69joas1smuSRT+PQJ41CKo1Cv747AF/w3ceTx2dzS+XWl9Et0rKsRBwxgvEnML2dpA3mdufaTprO7XPsumdcmqC9unGSja4HNz+Lg77ONZl6wycvyCC0LBxP51leVK02BABjhHz27sEX7l/rhT4cKodVlZVxzorKHn7qTQjpM/Lcrf3P3j2MQ+ZUWOjelOCIheHdl6N7X8R+pERV84tc3RNc18hCKbDM0yQzWgi1ZG6FhLDwledvgKuKHIytTdYmWTVPCt7hZgLXOyAgpoXIFuI76RDZdm+WTRXbvR0/+Fm2ewfGgM9K6TJfYyurx/omadEEQF0pgyiczbNsGUe01C4Ixp+9s//czV2lpOMyKi7BKoDtUW36xKyhPY0MofsLzxzev7lHKYFD08Na/nYl424wy7JU4zvxvVcQDTYwfm2DbOCzfR3MhqpjIKakyZ1eJAX4SDYr1+IICF2RcOdoe2KWc9BIto/6RPedCykxRneu70AuE6oOwgjCaqS9jcM6edKGCZEOryYLQWMzLdlwb5dlmtEg2hvHjJKG161ipbZmj21yAYTgfJ6lZWUP3TWde7U69BnkFVwy/nXeh8oGVMwhj298LenCxVJ500V6epG6M37FxdmFDq+k2sYVSMubqCwdwoDtj/v9KDBM0GgDGMXN7ry1CiAH05oofIrtalOenbH7e/nu3dwFF8DeAeHyisO0qI6nC5BsStpdfHvCPMl15txo4xbvi1cYY0gY7I6WSf92dKEEAStf39mpNGOuyWxecrAKadFuFdxbfVPeqG825XUM8Vy4GDA6mwPjJxWXqPG1e3bJdhct5BVmSf503IA2YqU8HAZ0H6pjkb9Gz4bnXmBdKNgb3DoYMUrgvAZ9YlPwFymIQgbwrE0fzqZmTdszJU4Z/6C2Ke8v2JBpENTCvsxFVpojBzXleReLHKi/lldACGMWrKkghQkSZTR7exyqjYyvGsaSuqmBKY+Ma6JQb1YUzhdZUtReftbYy2ekNpWWTXnmDdYNXVzVN3D92SwVQsGhi5rKy+oM0EqXjN+WaCIsPY3PXmXpsdGfHeXedpAmcL+xP7h1uBQFzkUDNaHXLC0mi9yKgstYvYgN4oBgB0u7UvyCLrjhdb6tN0EkBTA+qE3syPhSTebp2TQF2Fo7KEyRKMPpm9H0TSx0omn7iyPkNq2gAVjNtQ1iIwrDsHXJtjp6Pk9Bus1hu4ZhjAx7YWhr627Fr17I7h6OoJdrEd+qbzO302kC2hL6uDA+0va5PJ0kqVZTLoyP/fRIM352ohBWLfZ5uwSsbfK1onBzfwTV2la+s9nEeQaikFVcUIIJwQ1CaL1jsFGg8SjGLvSUNg1+MII6PqXEaUoK1HcG6rtySwvbsu1klk4u0pbgXCmEiedHiGfR5Mfh9C1UY/wuMmr2FG1jPXOztauwl1yCVYgDH22duYGWIqWsesHDfpAVVV7w1vKetMm1fgju5gkw9WIjU9skgQ7gwWnhXGAHa2tPSbISHE27FcVhcwb2s9MwO0KicCe92B70GYcPtUqNU4YHfAzesIzaxePQH/YCR6SFVJSAaA5gu0Zotmts5OJz4GLuMgdlbyM9v0impuTS2gVOBg74zK2dfvbQkw2M796QXpSDYnWHobPvT40oJGmZl+3qwlqBfuzH4Q7EsWcXKcBguXiR1ri4LeYgGMF+Be5gbM0ocO/1CKwRwJacVMqTLX3cbYBlJfSpALBUwV1nhly2pdS3azxzfQzmpKoEIOHIxVaN+Iwe7vR9IwHttVgh45DBvdeQaiRmh7q2ZB0Lc/UcCbosfFJgPakUjIGdiyQNubNPFiGr7lsiBMw5YHf2h+CtAyRujG+fEhYOLvd1uexcunNtfGt/RAm29tnEJWrLwpfXdMtHaX+X2G1uRSkuruqFDnqmqAQ3a+66BejTrY1cJRgdGT/0GTD+KA4tGK2M34/8l+5dg91pAIOQstWPSvOyAftVFzkrOUQn87T4eFuKMvVCiFhkuyAjKaXZcsQ77cWqldjcelmd43VvyKK+ZPzdfgS7/HyHBJkdDhj/8/evQ/zBhQa6OXLOiupEZ+s43lJDtsxnMxzgsp+YfBQcGglYZe1SzOA6be6zld9E271SrIoC0mNsmyjM0gpZNwD+AoUtIXWLA2b29wXKtNbCDjhmn3/2OjD+xvy2vcZq5AzmB1wp6IgxaooNsY4Nj819wsZYXuJXDw2ArElWGsZpLfByAEyLwtWPjZw1T4okLeyV3VvtfPf3CRN938SoRwmRbhr/3o0dqGgOYp+LzT2kBeCyaAiRc9Kc4DO/2yrvMcSGJkB5SoA2UjbX4QwAtlHxWZZHq6KwSDVgLn4qoAVXLivp7tvOsgLm0lVxAd1ffOawHzNlWivGICKg8WGnMBwJqdqUm7qYZ8D4q5EzQWijeQCEjs7Xb5C33wnC/w+Nf3V2SRhiKgAAAABJRU5ErkJggg==", { encoding: "base64" })
              outputLog.push("Created `pack.png`")
            }
            this.done++
            outputLog.push(`Created template resource pack \`${this.name}\``)
            this.status.processing = false
            this.status.finished = true
          },
          assetsToggle() {
            if (!this.vanillaAssets) {
              this.objects = false
            }
          },
          optifineToggle() {
            if (!this.create.optifine) {
              this.create.emissive = false
            }
          },
          emissiveToggle() {
            if (this.create.emissive) {
              this.create.optifine = true
            }
          }
        },
        template: `
          <div v-if="!status.processing && !status.finished">
            <div class="row">
              <div class="col spacer">
                <h3>Output Location:</h3>
                <folder-selector v-model="folder">the folder to output the resource pack to</folder-selector>
                <input-row v-model="name" placeholder="Enter name…" width="120" :required="attemptedStart && !name.length">Pack Name</input-row>
                <input-row v-model="description" placeholder="Enter description…" width="120">Pack Description</input-row>
                <version-selector v-model="version" />
                <div>
                  <checkbox-row v-model="assets" @input="assetsToggle">Import vanilla assets</checkbox-row>
                  <checkbox-row v-model="objects" :disabled="!assets">Also include objects (sounds, languages, panorama, etc…)</checkbox-row>
                </div>
              </div>
              <div class="col">
                <h3>Create Folders:</h3>
                <div>
                  <checkbox-row v-model="create.blockstates">blockstates</checkbox-row>
                  <checkbox-row v-model="create.models">models</checkbox-row>
                  <checkbox-row v-model="create.optifine" @input="optifineToggle">optifine</checkbox-row>
                  <checkbox-row v-model="create.textures">textures</checkbox-row>
                  <checkbox-row v-model="create.sounds">sounds</checkbox-row>
                </div>
                <h3>Create Files:</h3>
                <checkbox-row v-model="create.emissive" @input="emissiveToggle">emissive.properties</checkbox-row>
              </div>
            </div>
            <button :disabled="!folder" @click="execute">Create</button>
          </div>
          <div v-else>
            <progress-bar :done="done" :total="total" />
            <output-log v-model="outputLog" />
            <button v-if="status.processing" @click="cancelled = true">Cancel</button>
            <button v-else @click="status.finished = false">Done</button>
          </div>
        `
      }
    }
  }

  setupPlugin()
})()