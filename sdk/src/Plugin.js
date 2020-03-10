const Session = require('./Session')
const Commander = require('./Commander')

class _ {
    constructor(props) {
        this._props = Object.assign({}, { session: { name: "carmel" }}, props)
    }

    get props() {
        return this._props
    }

    get session() {
        return this._session
    }

    get command() {
        return this._command
    }

    findCommand(id) {
        return require(`./commands/${id}`)
    }

    loadCommand() {
        if (!this.props || !this.props.command) {
            return Promise.reject(new Error(_.ERRORS.CANNOT_LOAD('the command is missing')))
        }

        return new Promise((resolve, reject) => {
            try {
                const Command = this.findCommand(this.props.command.id)
                this._command = new Command(this.props.command.args)
                resolve(this.command)
            } catch (e) {
                reject(e)
            }
        })
    }

    load() {
        this._session = new Session(this.props.session)
        return this.loadCommand().then(() => this.session.initialize())
    }
 
    run() {
        return this.load()
                    .then(() => Commander.run(this.command, this.session))
    }

}

_.ERRORS = {
    CANNOT_LOAD: (reason) => reason ? `Cannot load plugin because ${reason}` : `Cannot load plugin`
}

module.exports = _