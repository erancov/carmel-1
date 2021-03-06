import path from 'path'
import getPort from 'get-port'
import open from 'open'

import {
  IProduct,
  Path,
  IFile,
  IDir,
  Target,
  File,
  Dir,
  ProductState,
  ISession,
  ISnapshot,
  Id,
  Errors,
  ICode,
  Code,
  IPacker,
  IStack,
  Strings,
} from '..'
import { Name } from '../types'
import shortid from 'shortid'

/**
 *
 * {@link https://github.com/fluidtrends/carmel/blob/master/sdk/src/Product.ts | Source Code } |
 * {@link https://codeclimate.com/github/fluidtrends/carmel/sdk/src/Product.ts/source | Code Quality} |
 * {@link https://codeclimate.com/github/fluidtrends/carmel/sdk/src/Product.ts/stats | Code Stats}
 *
 * @category Core
 */
export class Product implements IProduct {
  /** The default name of the manifest */
  public static MANIFEST_FILENAME = '.carmel.json'

  /** @internal */
  protected _id: Id

  /** @internal */
  protected _packerPort?: number

  /** @internal */
  protected _props: any

  /** @internal */
  protected _dir: IDir

  /** @internal */
  protected _cacheDir?: IDir

  /** @internal */
  protected _manifest: IFile

  /** @internal */
  protected _state: ProductState

  /** @internal */
  protected _session?: ISession

  /** @internal */
  protected _snapshot?: ISnapshot

  /** @internal */
  protected _code: ICode

  /** @internal */
  protected _packer?: IPacker

  /** @internal */
  protected _stack?: IStack

  /**
   *
   * @param session
   */
  constructor(session?: ISession, id?: string) {
    this._state = ProductState.UNLOADED
    this._session = session
    this._id = id || shortid.generate().toLowerCase()
    this._dir = new Dir(path.resolve(this.session?.index.sections.products.path, this.id!))
    this._manifest = new File(path.resolve(this.session?.index.sections.products.path, this.id!, Product.MANIFEST_FILENAME))
    this._code = new Code(this)
  }

  /**
   *
   */
  get packer() {
    return this._packer
  }
  
  get stack() {
    return this._stack
  }

  /**
   * 
   */
  get packerPort () {
    return this._packerPort
  }

  /**
   *
   */
  get code() {
    return this._code
  }

  /**
   *
   */
  get session() {
    return this._session
  }

  /**
   *
   */
  get state() {
    return this._state
  }

  /**
   *
   */
  get manifest() {
    return this._manifest
  }

  /**
   *
   */
  get dir() {
    return this._dir
  }

  /**
   *
   */
  get data() {
    return this.manifest.data.json()
  }

  /**
   *
   */
  get id() {
    return this._id
  }

  /**
   *
   */
  get exists() {
    return this.manifest.exists
  }

  /**
   *
   */
  get context() {
    return this.manifest.data.json().context
  }

  /**
   *
   */
  get isLoaded() {
    return this.state >= ProductState.LOADED
  }

  /**
   *
   */
  get snapshot() {
    return this._snapshot
  }

  /**
   *
   */
  get isReady() {
    return this.state >= ProductState.READY
  }

  /**
   * Move the Product into a new {@linkcode ProductState}
   *
   * @param state The new {@linkcode ProductState}
   */
  public changeState(state: ProductState) {
    this._state = state
  }

  /**
   *
   * @param id
   */
  async createFromTemplate(id: Id, name: Name) {
    const template = await this.session?.findTemplate(id)

    if (!template) {
      throw Errors.ProductCannotCreate(Strings.TemplateIsMissingString(id))
    }

    await template!.install(name, this)

    return this.load()
  }

  // /**
  //  *
  //  */
  // async openCode() {
  //   const file = this.cacheDir?.file('carmel.code-workspace')
  //   file && file.exists && (await open(file.path!))
  // }

  // /**
  //  *
  //  */
  // async openWeb() {
  //   await open(`https://carmel-${this.id}.vercel.app`)
  // }

  /**
   *
   * @param target
   * @param watch
   */
  async resolve(target: Target, watch: boolean) {
    this.load()

    if (!this.isLoaded) return

    // Figure out the roots
    const packerDir = new Dir(this.packer!.path!)
    const stackDir = new Dir(this.stack!.path!)

    // Look up the packer and the stack config
    const packerInstance = require(packerDir!.path!)
    const stackConfig = require(stackDir!.file('carmel.json')!.path!)

    // Make sure we've got them all
    if (
      !packerInstance ||
      !packerInstance[target] ||
      !stackConfig ||
      !stackConfig[target] ||
      !stackDir!.file('carmel.json')?.exists
    )
      return

    // Look for a port
    this._packerPort = await getPort()

    const isStatic = !watch 
    
    // Build the packer options
    const options = {
      contextDir: this.dir.path,
      mainDir: this.dir!.path,
      destDir: this.dir.dir(`.${target}`)!.path,
      stackDir: stackDir?.path,
      packerDir: packerDir?.path,
      stackConfig,
      entryFile: stackDir!.file(stackConfig[target].entry[isStatic ? 'static' : 'dom'])!.path!,
      target,
      entry: stackConfig[target].entry,
      templateFile: stackDir!.file(stackConfig[target].template)!.path!,
      watch,
      isStatic,
      port: this.packerPort,
      ...this.data,
    }

    // Let's send it all back
    this._packer = new packerInstance[target].Packer(options)

    return options
  }

  /**
   *
   */
  get cacheDir() {
    return this._cacheDir
  }

  /**
   * Load this product and all its artifacts, including its manifest
   */
  async load() {
    // No need to re-load this again
    if (this.isLoaded) return this

    if (!this.manifest.exists) {
      // Don't bother without a manifest
      this.changeState(ProductState.UNLOADED)
      return this
    }

    // Alright, let's do this
    this.changeState(ProductState.LOADING)

    // First things first, let's get the manifest loaded up
    this.manifest.load()

    // Keep track of the id
    this._id = this.manifest.data.json().id

    // Look for the packer and stack in the manifest
    const packerId = this.manifest.data.json().packer
    const stackId = this.manifest.data.json().stack

    // Look for the exact versions
    const packerVersion = this.manifest.data.json().packerVersion
    const stackVersion = this.manifest.data.json().stackVersion

    // Get the fresh packer and stack
    this._packer =
      packerId &&
      (await this.session?.index.installArchive({
        id: packerId,
        version: packerVersion,
        section: 'packers',
      }))

    this._stack =
      stackId &&
      (await this.session?.index.installArchive({
        id: stackId,
        version: stackVersion,
        section: 'stacks',
      }))

    // Get the code ready
    await this.code.initialize()

    // Prepare the snapshot if necessary and if all good,
    // then tell everyone we're ready for action
    this.changeState(ProductState.READY)

    // Let callers access us directly
    return this
  }

  /**
   *
   */
  async create(data?: any) {
    this.manifest.data.update(data)
    this.manifest.save()

    return this.manifest.data.json()
  }

  /**
   *
   * @param context
   */
  saveContext(context: object) {
    this.manifest.data.append({ context })
    this.manifest.save()
  }

  /**
   *
   * @param data
   */
  saveData(data: any) {
    this.manifest.data.append(data)
    this.manifest.save()
  }

  /**
   *
   * @param path
   */
  async loadFile(path: Path) {
    const file = new File(path)
    return file.load()
  }

  /**
   *
   * @param dirpath
   */
  findDirs(dirpath: Path) {
    return this.dir.dir(dirpath)?.dirs || []
  }
}
