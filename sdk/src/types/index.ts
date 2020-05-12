/*******************************************************
 *                     Primitives                      *
 *******************************************************/

export type Id = string;
export type Name = string;
export type Path = string;
export type UTF8 = string;

/*******************************************************
 *                     Properties                      *
 *******************************************************/

export interface Props {
    readonly id: Id;
    readonly name: Name;
}

export interface StackProps extends Props {
}

export interface SessionProps extends Props {
}

export interface WorkspaceProps extends Props {
    cwd: Path;
}

export interface CommandProps extends Props {
}

/*******************************************************
 *                   Class Interfaces                  *
 *******************************************************/

export interface IClass {
}

export interface IData extends IClass {
    readonly raw: UTF8;

    json(): object;
    update(data: UTF8 | object): void;
    append(data: UTF8 | object): void;
}

export interface IFile extends IClass {
    readonly path: Path;
    readonly data: IData;
    readonly exists: boolean;

    load(): void;
    save(): void;
    update(data: UTF8 | object): void;
}

export interface IStack extends IClass {
    readonly props: StackProps 
}

export interface ILogger extends IClass  {
    readonly props: SessionProps;
}

export interface ISession extends IClass  {
    readonly props: SessionProps;
}

export interface IWorkspace extends IClass  {
    readonly props: WorkspaceProps;
    readonly dir: Path;
    readonly manifest: IFile;
    readonly session: ISession;
    readonly exists: boolean;
    
    load(): void;
    create(): void;
    initialize(): void;
    saveContext(context: object): void;
}

export interface ICommand extends IClass  {
    readonly props: CommandProps;
}