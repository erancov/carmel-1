import { send } from './main'
import { window } from '../window'
import * as system from '../system'
import { download } from 'electron-dl'
import fs from 'fs-extra'
import path from 'path'
import shortid from 'shortid'
import os from 'os'
import axios from 'axios'
import { shell } from './commands'
import { createProduct } from './products'
import * as pacote from 'pacote'

export const downloadFile = async (data: any) => {
    const now = Date.now()
    const env = system.env()
    const directory = path.resolve(env.home.path, 'downloads')

    let totalProgress = 0
    let totalBytes = 0
    fs.existsSync(directory) || fs.mkdirsSync(directory)
    const startTime = Date.now()

    const file = path.resolve(directory, data.filename)

    if (fs.existsSync(file)) {
        return { file, time: 0 }
    }

    const onProgress = async (progress: any) => {
        totalProgress = Math.round(100 * progress.percent)
        totalBytes = progress.totalBytes
        data.onProgress && data.onProgress(totalProgress)
    }

    await download(window, data.url, { directory, onProgress })
    const totalTime = Date.now() - startTime
    const downloadSpeed = Math.round(totalBytes / totalTime) / 1000

    return { 
        downloadSpeed, 
        file,         
        time: Math.round((Date.now() - now) / 1000)
    }
}

export const downloadDependency = async (data: any) => {
    const now = Date.now()
    const env = system.env()
    const manifest = await pacote.manifest(data.id)
    const cwd = path.resolve(env.home.path, data.type, manifest.name, manifest.version, manifest.name)

    if (fs.existsSync(cwd)) return {
        version: manifest.version, time: 0, name: manifest.name
    }
  
    await pacote.extract(manifest._resolved, cwd)

    if (!fs.existsSync(path.resolve(cwd, 'package.json'))) return

    return {
        time: Math.round((Date.now() - now) / 1000),
        version: manifest.version,
        name: manifest.name
    }
}

export const installDependencies = async (data: any) => {
    const env = system.env()
    const cwd = path.resolve(env.home.path, data.type, data.name, data.version, data.name)

    return await shell({ cmd: `yarn install`, cwd })
}

export const installArchive = async (data: any) => {
    const now = Date.now()
    const env = system.env()
    const { name, version } = data
    const platform = `${os.platform}-${os.arch}`
    const filename = `${name}-${version}-${platform}.tar.gz`
    const dir = path.resolve(env.home.path, data.type, name, version)
    const dest = path.resolve(dir, name)

    if (fs.existsSync(dest)) {
        return {
            dest, 
            time: 0
        }
    }

    fs.mkdirsSync(dir)

    const url = `http://store.carmel.io/archives/${filename}`
    const stream = await axios({ method: 'get', url, responseType: 'stream' })

    await new Promise((resolve, reject) => {
            stream.data
                .pipe(require('zlib').createGunzip({ fromBase: false }))
                .pipe(require('tar').x({ strip: 0, C: dir }))
               .on('end', () => resolve())
    })

    return {
        dest,
        time: Math.round((Date.now() - now) / 1000),
    }
}

export const installMirror = async (data: any) => {
    const now = Date.now()
    const env = system.env()
    const { version } = data
    const dir = env.cache.path

    fs.existsSync(dir) || fs.mkdirsSync(dir)
    const filename = `yarnmirror-${version}.tar.gz`

    const url = `http://store.carmel.io/archives/${filename}`
    console.log("getting mirror", url)
    const stream = await axios({ method: 'get', url, responseType: 'stream' })
    console.log("got stream")

    await new Promise((resolve, reject) => {
            stream.data
            .pipe(require('zlib').createGunzip())
                // .on('data', function (data: any) {
                    // console.log(".....zbli", data.length)
                // })
                // .on('error', function(err: any) {
                    // console.log('ERROR: Failed to gunzip ' + ': ' + err.message);
                // })
                .pipe(require('tar').extract({ cwd: dir }))
                // .on('data', function (data: any) {
                    // console.log(".....x")
                // })
                // .on('error', function(err: any) {
                    // console.log('ERROR: Failed to untar ' + ': ' + err.message);
                // })
                // .on('end', () => {
                    // console.log("END")
                    // resolve()
                // })
                .on('close', function() {
                    console.log('Download and extract of ' + ' finished.');
                    resolve()
                });
            //     .pipe(require('zlib').createGunzip({ fromBase: false }))
            //     .pipe(require('tar').x({ strip: 0, C: dir }))
            //    .on('end', () => resolve())
            //    .on('error', (error: any) => console.log(error))
    })

    console.log("got mirror", url)

    return {
        time: Math.round((Date.now() - now) / 1000),
    }
}

export const installBundle = async (data: any) => {
    const archive = await downloadDependency({ id: data.id, type: "bundles" })
    await installDependencies({ name: archive.name, version: archive.version, type: "bundles" })

    return archive    
}

export const installPacker = async (data: any) => {
    const archive = await downloadDependency({ id: data.id, type: "packers" })
    await installDependencies({ name: archive.name, version: archive.version, type: "packers" })

    return archive    
}

export const installStack = async (data: any) => {
    const archive = await downloadDependency({ id: data.id, type: "stacks" })
    await installDependencies({ name: archive.name, version: archive.version, type: "stacks" })

    return archive
} 

export const setup = async (data: any) => {
    const nodeVersion = '12.18.3'
    let totalTime = 0
    const env = system.env()

    await send({ id: data.id, type: 'settingUp', status: 'Setting Up Your Environment ...' })    

    fs.existsSync(env.cache.path) || fs.mkdirsSync(env.cache.path)

    const yarnFile = path.resolve(env.home.path, '.yarnrc')

    if (!fs.existsSync(yarnFile)) {
        fs.writeFileSync(yarnFile, `registry "https://registry.npmjs.org/"
yarn-offline-mirror-pruning true
yarn-offline-mirror ./cache/yarnmirror
--install.production true
--install.no-progress true
--install.silent true
--install.prefer-offline true
--cache-folder ./cache/yarncache`, 'utf8')
    }

    await send({ id: data.id, type: 'settingUp', status: `Installing mirrors ...` })  

    const mirror0 = await installMirror({ version: 0 })
    totalTime = totalTime + mirror0.time 
    console.log("mirror0", mirror0.time, totalTime)

    const mirror1 = await installMirror({ version: 1 })
    totalTime = totalTime + mirror1.time 
    console.log("mirror1", mirror1.time, totalTime)

    const mirror2 = await installMirror({ version: 2 })
    totalTime = totalTime + mirror2.time 
    console.log("mirror2", mirror2.time, totalTime)

    const mirror3 = await installMirror({ version: 3 })
    totalTime = totalTime + mirror3.time 
    console.log("mirror3", mirror3.time, totalTime)

    console.log("mirrors installed")

    await send({ id: data.id, type: 'settingUp', status: 'Installing Node.js ...' })    

    const node = await installArchive({ name: 'node', version: nodeVersion, type: "cache" })
    totalTime = totalTime + node.time 
    console.log("node", node.time, totalTime)
    fs.symlinkSync(path.resolve(env.cache.path, 'node', nodeVersion), path.resolve(env.cache.path, 'node', 'default'), 'dir')

    await send({ id: data.id, type: 'settingUp', status: 'Installing yarn ...' })    

    const yarn = await shell({ cmd: 'npm i -g yarn' })
    totalTime = totalTime + yarn.time
    console.log("yarn", yarn.time, totalTime)

    await send({ id: data.id, type: 'settingUp', status: 'Installing Carmel Dependencies ...' })    

    const sdk = await downloadDependency({ id: '@carmel/sdk', type: "cache" })
    totalTime = totalTime + sdk.time
    console.log("sdk", sdk.time, totalTime)

    const sdkDeps = await installDependencies({ name: sdk.name, version: sdk.version, type: "cache" })
    totalTime = totalTime + sdkDeps.time
    console.log("sdk deps", sdkDeps.time, totalTime)
    fs.symlinkSync(path.resolve(env.cache.path, sdk.name, sdk.version), path.resolve(env.cache.path, sdk.name, 'default'), 'dir')

    await send({ id: data.id, type: 'settingUp', status: 'Installing The Default Packer (papanache)...' })    

    const papanache = await installPacker({ id: "papanache" })
    totalTime = totalTime + papanache.time
    console.log("papanache", papanache.time, totalTime)
    fs.symlinkSync(path.resolve(env.home.path, 'packers', papanache.name, papanache.version), path.resolve(env.home.path, 'packers', papanache.name, 'default'), 'dir')

    await send({ id: data.id, type: 'settingUp', status: 'Installing The Default Stack (jayesse)...' })    

    const jayesse = await installStack({ id: "jayesse" })
    totalTime = totalTime + jayesse.time
    console.log("jayesse", jayesse.time, totalTime)
    fs.symlinkSync(path.resolve(env.home.path, 'stacks', jayesse.name, jayesse.version), path.resolve(env.home.path, 'stacks', jayesse.name, 'default'), 'dir')

    await send({ id: data.id, type: 'settingUp', status: 'Installing The Default Bundle (@fluidtrends/bananas)...' })    

    const bananas = await installBundle({ id: "@fluidtrends/bananas" })
    totalTime = totalTime + bananas.time
    console.log("bananas", bananas.time, totalTime)
    fs.symlinkSync(path.resolve(env.home.path, 'bundles', bananas.name, bananas.version), path.resolve(env.home.path, 'bundles', bananas.name, 'default'), 'dir')

    await send({ id: data.id, type: 'settingUp', status: 'Creating A Sample Product ...' })    

    console.log("creating.....")

    const product: any = await createProduct({ 
        node: nodeVersion, 
        sdk: sdk.version, 
        name: "My First Product",
        template: "@fluidtrends/bananas/starter"
    })

    console.log("sample product ok")

    await send({ id: data.id, type: 'settingUp', status: 'Initializing Your System ...' })    

    system.init({
        productId: product.id,
        yarn: true,
        node: {
            default: nodeVersion,
            versions: [nodeVersion]
        },
        sdk: {
            default: sdk.version,
            versions: [sdk.version]
        },
        packers: {
            papanache: { versions: [papanache.version] }
        },
        stacks: {
            jayesse: { versions: [jayesse.version] }
        },
        bundles: {
            "@fluidtrends/bananas": { versions: [bananas.version] }
        }
    })
    
    await send({ id: data.id, type: 'settingUp', status: 'Your Carmel Environment Is Ready', done: true })    
}