"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Main_1;
Object.defineProperty(exports, "__esModule", { value: true });
"use strict";
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
const Routing = require("@singleware/routing");
const Injection = require("@singleware/injection");
const Types = require("./types");
/**
 * Generic main application class.
 */
let Main = Main_1 = class Main extends Class.Null {
    /**
     * Default constructor.
     * @param settings Application settings.
     */
    constructor(settings) {
        super();
        /**
         * Determines whether the application is started or not.
         */
        this.started = false;
        /**
         * Dependency Injection Manager.
         */
        this.dim = new Injection.Manager();
        /**
         * Array of services.
         */
        this.services = [];
        /**
         * Array of loggers.
         */
        this.loggers = [];
        /**
         * Receive handler listener.
         */
        this.receiveHandlerListener = this.receiveHandler.bind(this);
        /**
         * Send handler listener.
         */
        this.sendHandlerListener = this.sendHandler.bind(this);
        /**
         * Error handler listener.
         */
        this.errorHandlerListener = this.errorHandler.bind(this);
        this.filters = new Routing.Router(settings);
        this.processors = new Routing.Router(settings);
    }
    /**
     * Adds a new route handler.
     * @param handler Handler type.
     * @param route Route settings.
     */
    static addRoute(handler, route) {
        let list;
        if (!(list = this.routes.get(handler))) {
            this.routes.set(handler, (list = []));
        }
        list.push(route);
    }
    /**
     * Notify all registered loggers about new requests.
     * @param type Notification type.
     * @param request Request information.
     * @throws Throws an error when the notification type is not valid.
     */
    notifyRequest(type, request) {
        const copy = Object.freeze({ ...request });
        for (const logger of this.loggers) {
            switch (type) {
                case Types.Request.Receive:
                    logger.onReceive(copy);
                    break;
                case Types.Request.Process:
                    logger.onProcess(copy);
                    break;
                case Types.Request.Send:
                    logger.onSend(copy);
                    break;
                case Types.Request.Error:
                    logger.onError(copy);
                    break;
                default:
                    throw new TypeError(`Request type '${type}' doesn't supported.`);
            }
        }
    }
    /**
     * Notify all registered loggers about new actions.
     * @param type Notification type.
     * @param request Request information.
     * @throws Throws an error when the notification type is not valid.
     */
    notifyAction(type) {
        for (const logger of this.loggers) {
            switch (type) {
                case Types.Action.Start:
                    logger.onStart(void 0);
                    break;
                case Types.Action.Stop:
                    logger.onStop(void 0);
                    break;
                default:
                    throw new TypeError(`Action type '${type}' doesn't supported.`);
            }
        }
    }
    /**
     * Performs the specified handler method with the given route match and parameters.
     * @param handler Handler class.
     * @param method Handler method name.
     * @param parameters Handler constructor parameters.
     * @param match Route match.
     * @returns Returns the same value returned by the performed handler method.
     */
    async performHandler(handler, method, parameters, match) {
        let result;
        try {
            result = await new handler(...parameters)[method](match);
        }
        catch (error) {
            match.detail.error = error;
            this.notifyRequest(Types.Request.Error, match.detail);
        }
        finally {
            return result;
        }
    }
    /**
     * Performs all route filters for the specified request with the given variables.
     * @param request Request information.
     * @param variables Request processor variables.
     * @returns Returns true when the request access is granted or false otherwise.
     */
    async performFilters(request, variables) {
        const local = request.environment.local;
        const match = this.filters.match(request.path, request);
        while (request.granted && match.length) {
            request.environment.local = {
                ...variables,
                ...match.variables,
                ...local
            };
            await match.next();
            request.environment.local = local;
        }
        return request.granted || false;
    }
    /**
     * Receiver handler.
     * @param request Request information.
     */
    async receiveHandler(request) {
        this.notifyRequest(Types.Request.Receive, request);
        const local = request.environment.local;
        const match = this.processors.match(request.path, request);
        while (match.length && (await this.performFilters(request, match.variables))) {
            request.environment.local = {
                ...match.variables,
                ...local
            };
            await match.next();
            request.environment.local = local;
        }
        this.notifyRequest(Types.Request.Process, request);
    }
    /**
     * Send handler.
     * @param request Request information.
     */
    async sendHandler(request) {
        this.notifyRequest(Types.Request.Send, request);
    }
    /**
     * Error handler.
     * @param request Request information.
     */
    async errorHandler(request) {
        this.notifyRequest(Types.Request.Error, request);
    }
    /**
     * Filter handler to be inherited and extended.
     * @param match Match information.
     * @param allows Determine whether the filter is allowing the request matching or not.
     * @returns Returns true when the filter handler still allows the request matching or false otherwise.
     */
    async filterHandler(match, allows) {
        return allows;
    }
    /**
     * Process handler to be inherited and extended.
     * @param match Match information.
     * @param callback Callable member.
     */
    async processHandler(match, callback) {
        await callback(match);
    }
    /**
     * Decorates the specified class to be an application dependency.
     * @param settings Dependency settings.
     * @returns Returns the decorator method.
     */
    Dependency(settings) {
        return this.dim.Describe(settings);
    }
    /**
     * Decorates the specified class to be injected by the specified application dependencies.
     * @param list List of dependencies.
     * @returns Returns the decorator method.
     */
    Inject(...list) {
        return this.dim.Inject(...list);
    }
    /**
     * Adds a generic route handler into this application.
     * @param handler Handler class type.
     * @returns Returns the own instance.
     */
    addHandler(handler, ...parameters) {
        if (this.started) {
            throw new Error(`To add new handlers the application must be stopped.`);
        }
        const routes = Main_1.routes.get(handler.prototype.constructor) || [];
        for (const route of routes) {
            switch (route.type) {
                case Types.Route.Filter:
                    this.filters.add({
                        ...route.action,
                        onMatch: async (match) => {
                            const allows = (await this.performHandler(handler, route.method, parameters, match)) === true;
                            match.detail.granted = (await this.filterHandler(match, allows)) && allows === true;
                        }
                    });
                    break;
                case Types.Route.Processor:
                    this.processors.add({
                        ...route.action,
                        exact: route.action.exact === void 0 ? true : route.action.exact,
                        onMatch: async (match) => {
                            const callback = this.performHandler.bind(this, handler, route.method, parameters);
                            await this.processHandler(match, callback);
                        }
                    });
                    break;
                default:
                    throw new TypeError(`Unsupported route type ${route.type}`);
            }
        }
        return this;
    }
    /**
     * Adds a service handler into this application.
     * @param instance Service class type or instance.
     * @returns Returns the service instance.
     */
    addService(service, ...parameters) {
        if (this.started) {
            throw new Error(`To add new services the application must be stopped.`);
        }
        if (service instanceof Function) {
            service = new service(...parameters);
        }
        this.services.push(service);
        return service;
    }
    /**
     * Adds a logger handler into this application.
     * @param logger Logger class type or instance.
     * @returns Returns the logger instance.
     */
    addLogger(logger, ...parameters) {
        if (this.started) {
            throw new Error(`To add new loggers service the application must be stopped.`);
        }
        if (logger instanceof Function) {
            logger = new logger(...parameters);
        }
        this.loggers.push(logger);
        return logger;
    }
    /**
     * Starts the application with all included services.
     * @returns Returns the own instance.
     */
    start() {
        if (this.started) {
            throw new Error(`Application was already started.`);
        }
        this.notifyAction(Types.Action.Start);
        for (const service of this.services) {
            service.onReceive.subscribe(this.receiveHandlerListener);
            service.onSend.subscribe(this.sendHandlerListener);
            service.onError.subscribe(this.errorHandlerListener);
            service.start();
        }
        this.started = true;
        return this;
    }
    /**
     * Stops the application and all included services.
     * @returns Returns the own instance.
     */
    stop() {
        if (!this.started) {
            throw new Error(`Application wasn't started.`);
        }
        for (const service of this.services) {
            service.stop();
            service.onReceive.unsubscribe(this.receiveHandlerListener);
            service.onSend.unsubscribe(this.sendHandlerListener);
            service.onError.unsubscribe(this.errorHandlerListener);
        }
        this.started = false;
        this.notifyAction(Types.Action.Stop);
        return this;
    }
    /**
     * Decorates the specified member to filter an application request.
     * @param action Filter action settings.
     * @returns Returns the decorator method.
     */
    static Filter(action) {
        return (prototype, property, descriptor) => {
            if (!(descriptor.value instanceof Function)) {
                throw new TypeError(`Only methods are allowed as filters.`);
            }
            this.addRoute(prototype.constructor, {
                type: Types.Route.Filter,
                action: action,
                method: property
            });
        };
    }
    /**
     * Decorates the specified member to process an application request.
     * @param action Route action settings.
     * @returns Returns the decorator method.
     */
    static Processor(action) {
        return (prototype, property, descriptor) => {
            if (!(descriptor.value instanceof Function)) {
                throw new TypeError(`Only methods are allowed as processors.`);
            }
            this.addRoute(prototype.constructor, {
                type: Types.Route.Processor,
                action: action,
                method: property
            });
        };
    }
};
/**
 * Global routes.
 */
Main.routes = new WeakMap();
__decorate([
    Class.Private()
], Main.prototype, "started", void 0);
__decorate([
    Class.Private()
], Main.prototype, "dim", void 0);
__decorate([
    Class.Private()
], Main.prototype, "services", void 0);
__decorate([
    Class.Private()
], Main.prototype, "loggers", void 0);
__decorate([
    Class.Private()
], Main.prototype, "filters", void 0);
__decorate([
    Class.Private()
], Main.prototype, "processors", void 0);
__decorate([
    Class.Private()
], Main.prototype, "receiveHandlerListener", void 0);
__decorate([
    Class.Private()
], Main.prototype, "sendHandlerListener", void 0);
__decorate([
    Class.Private()
], Main.prototype, "errorHandlerListener", void 0);
__decorate([
    Class.Private()
], Main.prototype, "notifyRequest", null);
__decorate([
    Class.Private()
], Main.prototype, "notifyAction", null);
__decorate([
    Class.Private()
], Main.prototype, "performHandler", null);
__decorate([
    Class.Private()
], Main.prototype, "performFilters", null);
__decorate([
    Class.Private()
], Main.prototype, "receiveHandler", null);
__decorate([
    Class.Private()
], Main.prototype, "sendHandler", null);
__decorate([
    Class.Private()
], Main.prototype, "errorHandler", null);
__decorate([
    Class.Protected()
], Main.prototype, "filterHandler", null);
__decorate([
    Class.Protected()
], Main.prototype, "processHandler", null);
__decorate([
    Class.Protected()
], Main.prototype, "Dependency", null);
__decorate([
    Class.Protected()
], Main.prototype, "Inject", null);
__decorate([
    Class.Protected()
], Main.prototype, "addHandler", null);
__decorate([
    Class.Protected()
], Main.prototype, "addService", null);
__decorate([
    Class.Protected()
], Main.prototype, "addLogger", null);
__decorate([
    Class.Protected()
], Main.prototype, "start", null);
__decorate([
    Class.Protected()
], Main.prototype, "stop", null);
__decorate([
    Class.Private()
], Main, "routes", void 0);
__decorate([
    Class.Private()
], Main, "addRoute", null);
__decorate([
    Class.Public()
], Main, "Filter", null);
__decorate([
    Class.Public()
], Main, "Processor", null);
Main = Main_1 = __decorate([
    Class.Describe()
], Main);
exports.Main = Main;
//# sourceMappingURL=main.js.map