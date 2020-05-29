export type Id         = string;
export type Version    = string;
export type Name       = string;
export type Path       = string;
export type UTF8       = string;
export type JSON       = any;
export type Module     = any;

export type CommandArg = {
    name: string,
    value: any
}

export interface IClass {
}

export enum ArtifactsKind {
    UNKNOWN   = "unknown",
    STACKS    = "stacks",
    TEMPLATES = "templates",
    ASSETS    = "assets"
}

export enum ProductState {
    UNKNOWN    = 0,
    UNLOADED   = 10,
    LOADING    = 20,
    LOADED     = 30,
    READY      = 40
}

export enum SessionState {
    UNKNOWN         = 0,
    UNINITIALIZED   = 10,
    INITIALIZING    = 20,
    INITIALIZED     = 30,
    READY           = 40
}

export enum EngineState {
    UNKNOWN  = 0,
    STOPPED  = 10,
    STARTING = 20,
    STARTED  = 30,
    READY    = 40,
    RUNNING  = 50
}

export enum Target {
    UNKNOWN     = "unknown",
    NONE        = "none",
    LOCAL       = "local",
    WEB         = "web",
    CLOUD       = "cloud",
    BLOCKCHAIN  = "blockchain",
    MOBILE      = "mobile"
}

export enum CommandType {
    UNKNOWN = "unknown",
    ENVIRONMENT = "environment",
    WORKSPACE = "workspace",
    PRODUCT = "product"
}