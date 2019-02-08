/**
 * Copyright (C) 2018 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
import * as Class from '@singleware/class';
import * as Routing from '@singleware/routing';
import * as Injection from '@singleware/injection';
import { ClassDecorator, MemberDecorator, Constructor, Callable } from './types';
import { Settings } from './settings';
import { Service } from './service';
import { Action } from './action';
import { Request } from './request';
import { Logger } from './logger';
/**
 * Generic main application class.
 */
export declare class Main<I, O> extends Class.Null {
    /**
     * DI management.
     */
    private dependencies;
    /**
     * Array of services.
     */
    private services;
    /**
     * Array of loggers.
     */
    private loggers;
    /**
     * Router for filters.
     */
    private filters;
    /**
     * Router for processors.
     */
    private processors;
    /**
     * Determines whether the application is started or not.
     */
    private started;
    /**
     * Receive handler listener.
     */
    private receiveHandlerListener;
    /**
     * Send handler listener.
     */
    private sendHandlerListener;
    /**
     * Error handler listener.
     */
    private errorHandlerListener;
    /**
     * Receiver handler.
     */
    private receiveHandler;
    /**
     * Send handler.
     */
    private sendHandler;
    /**
     * Error handler.
     */
    private errorHandler;
    /**
     * Protect all necessary properties of the specified request.
     * @param request Request information.
     */
    private protectRequest;
    /**
     * Filter event handler.
     * @param match Matched routes.
     * @param callback Handler callback.
     */
    protected filterHandler(match: Routing.Match<Request<I, O>>, callback: Callable): Promise<void>;
    /**
     * Process event handler.
     * @param match Matched routes.
     * @param callback Handler callback.
     */
    protected processHandler(match: Routing.Match<Request<I, O>>, callback: Callable): Promise<void>;
    /**
     * Get a new route based on the specified action settings.
     * @param action Action settings.
     * @param exact Determines whether the default exact parameter must be true or not.
     * @param handler Callback to handle the route.
     */
    private getRoute;
    /**
     * Adds a new route filter.
     * @param route Route settings.
     * @param handler Handler class type.
     * @param parameters Handler parameters.
     */
    private addFilter;
    /**
     * Adds a new route processor.
     * @param route Route settings.
     * @param handler Handler class type.
     * @param parameters Handler parameters.
     */
    private addProcessor;
    /**
     * Notify all registered loggers.
     * @param type Notification type.
     * @param request Request information.
     * @throws Throws an error when the logger state is invalid.
     */
    private notifyAllLoggers;
    /**
     * Default constructor.
     * @param settings Application settings.
     */
    constructor(settings: Settings);
    /**
     * Decorates the specified class to be an application dependency.
     * @param settings Dependency settings.
     * @returns Returns the decorator method.
     */
    Dependency(settings: Injection.Settings): ClassDecorator;
    /**
     * Decorates the specified class to be injected by the specified application dependencies.
     * @param list List of dependencies.
     * @returns Returns the decorator method.
     */
    Inject(...list: Injection.Dependency<any>[]): ClassDecorator;
    /**
     * Constructs a new instance of the specified class type.
     * @param type Class type.
     * @param parameters Initial parameters.
     * @returns Returns a new instance of the specified class type.
     */
    construct<T extends Object>(type: Constructor<T>, ...parameters: any[]): T;
    /**
     * Adds an application handler into this application.
     * @param handler Handler class type.
     * @returns Returns the own instance.
     */
    addHandler(handler: Class.Constructor, ...parameters: any[]): Main<I, O>;
    /**
     * Adds an application service into this application.
     * @param instance Service class type.
     * @returns Returns the service instance.
     */
    addService<T extends Service<I, O>>(service: Constructor<T>, ...parameters: any[]): T;
    /**
     * Adds an application logger into this application.
     * @param logger Logger class type.
     * @returns Returns the logger instance.
     */
    addLogger<T extends Logger<I, O>>(logger: Constructor<T>, ...parameters: any[]): T;
    /**
     * Starts the application with all included services.
     * @returns Returns the own instance.
     */
    start(): Main<I, O>;
    /**
     * Stops the application and all included services.
     * @returns Returns the own instance.
     */
    stop(): Main<I, O>;
    /**
     * Global application routes.
     */
    private static routes;
    /**
     * Adds a new route handler.
     * @param handler Handler type.
     * @param route Route settings.
     */
    private static addRoute;
    /**
     * Decorates the specified member to filter an application request.
     * @param action Filter action settings.
     * @returns Returns the decorator method.
     */
    static Filter(action: Action): MemberDecorator;
    /**
     * Decorates the specified member to process an application request.
     * @param action Route action settings.
     * @returns Returns the decorator method.
     */
    static Processor(action: Action): MemberDecorator;
}
