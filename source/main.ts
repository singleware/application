/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
import * as Class from '@singleware/class';
import * as Routing from '@singleware/routing';
import * as Injection from '@singleware/injection';

import * as Aliases from './aliases';
import * as Types from './types';

import { Settings } from './settings';
import { Service } from './service';
import { Action } from './action';
import { Request } from './request';
import { Route } from './route';
import { Logger } from './logger';

/**
 * Generic main application class.
 */
@Class.Describe()
export class Main<I, O> extends Class.Null {
  /**
   * Global routes.
   */
  @Class.Private()
  private static routes = new WeakMap<Aliases.Constructor, Route[]>();

  /**
   * Determines whether the application is started or not.
   */
  @Class.Private()
  private started = false;

  /**
   * Dependency Injection Manager.
   */
  @Class.Private()
  private dim = new Injection.Manager();

  /**
   * Array of services.
   */
  @Class.Private()
  private services = <Service<I, O>[]>[];

  /**
   * Array of loggers.
   */
  @Class.Private()
  private loggers = <Logger<I, O>[]>[];

  /**
   * Router for filters.
   */
  @Class.Private()
  private filters: Aliases.Router<I, O>;

  /**
   * Router for processors.
   */
  @Class.Private()
  private processors: Aliases.Router<I, O>;

  /**
   * Receive handler listener.
   */
  @Class.Private()
  private receiveHandlerListener = this.receiveHandler.bind(this);

  /**
   * Send handler listener.
   */
  @Class.Private()
  private sendHandlerListener = this.sendHandler.bind(this);

  /**
   * Error handler listener.
   */
  @Class.Private()
  private errorHandlerListener = this.errorHandler.bind(this);

  /**
   * Adds a new route handler.
   * @param handler Handler type.
   * @param route Route settings.
   */
  @Class.Private()
  private static addRoute(handler: Aliases.Constructor, route: Route): void {
    let list;
    if (!(list = <Route[]>this.routes.get(handler))) {
      this.routes.set(handler, (list = <Route[]>[]));
    }
    list.push(route);
  }

  /**
   * Notify all registered loggers about new requests.
   * @param type Notification type.
   * @param request Request information.
   * @throws Throws an error when the notification type is not valid.
   */
  @Class.Private()
  private notifyRequest(type: Types.Request, request: Request<I, O>): void {
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
  @Class.Private()
  private notifyAction(type: Types.Action): void {
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
  @Class.Private()
  private async performHandler(handler: Aliases.Constructor, method: string, parameters: any[], match: Aliases.Match<I, O>): Promise<any> {
    let result;
    try {
      result = await (<any>new handler(...parameters))[method](match);
    } catch (error) {
      match.detail.error = error;
      this.notifyRequest(Types.Request.Error, match.detail);
    } finally {
      return result;
    }
  }

  /**
   * Performs all route filters for the specified request with the given variables.
   * @param request Request information.
   * @param variables Request processor variables.
   * @returns Returns true when the request access is granted or false otherwise.
   */
  @Class.Private()
  private async performFilters(request: Request<I, O>, variables: Aliases.Variables): Promise<boolean> {
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
  @Class.Private()
  private async receiveHandler(request: Request<I, O>): Promise<void> {
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
  @Class.Private()
  private async sendHandler(request: Request<I, O>): Promise<void> {
    this.notifyRequest(Types.Request.Send, request);
  }

  /**
   * Error handler.
   * @param request Request information.
   */
  @Class.Private()
  private async errorHandler(request: Request<I, O>): Promise<void> {
    this.notifyRequest(Types.Request.Error, request);
  }

  /**
   * Filter handler to be inherited and extended.
   * @param match Match information.
   * @param allows Determine whether the filter is allowing the request matching or not.
   * @returns Returns true when the filter handler still allows the request matching or false otherwise.
   */
  @Class.Protected()
  protected async filterHandler(match: Aliases.Match<I, O>, allows: boolean): Promise<boolean> {
    return allows;
  }

  /**
   * Process handler to be inherited and extended.
   * @param match Match information.
   * @param callback Callable member.
   */
  @Class.Protected()
  protected async processHandler(match: Aliases.Match<I, O>, callback: Aliases.Callable): Promise<void> {
    await callback(match);
  }

  /**
   * Decorates the specified class to be an application dependency.
   * @param settings Dependency settings.
   * @returns Returns the decorator method.
   */
  @Class.Protected()
  protected Dependency(settings: Injection.Settings): Aliases.ClassDecorator {
    return this.dim.Describe(settings);
  }

  /**
   * Decorates the specified class to be injected by the specified application dependencies.
   * @param list List of dependencies.
   * @returns Returns the decorator method.
   */
  @Class.Protected()
  protected Inject(...list: Injection.Dependency<any>[]): Aliases.ClassDecorator {
    return this.dim.Inject(...list);
  }

  /**
   * Adds a generic route handler into this application.
   * @param handler Handler class type.
   * @returns Returns the own instance.
   */
  @Class.Protected()
  protected addHandler(handler: Aliases.Constructor, ...parameters: any[]): Main<I, O> {
    if (this.started) {
      throw new Error(`To add new handlers the application must be stopped.`);
    }
    const routes = <Route[]>Main.routes.get(handler.prototype.constructor) || [];
    for (const route of routes) {
      switch (route.type) {
        case Types.Route.Filter:
          this.filters.add({
            ...route.action,
            onMatch: async (match: Aliases.Match<I, O>): Promise<void> => {
              const allows = (await this.performHandler(handler, route.method, parameters, match)) === true;
              match.detail.granted = (await this.filterHandler(match, allows)) && allows === true;
            }
          });
          break;
        case Types.Route.Processor:
          this.processors.add({
            ...route.action,
            exact: route.action.exact === void 0 ? true : route.action.exact,
            onMatch: async (match: Aliases.Match<I, O>): Promise<void> => {
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
  @Class.Protected()
  protected addService<T extends Service<I, O>>(service: Aliases.Constructor<T> | T, ...parameters: any[]): T {
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
  @Class.Protected()
  protected addLogger<T extends Logger<I, O>>(logger: Aliases.Constructor<T> | T, ...parameters: any[]): T {
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
  @Class.Protected()
  protected start(): Main<I, O> {
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
  @Class.Protected()
  protected stop(): Main<I, O> {
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
   * Default constructor.
   * @param settings Application settings.
   */
  constructor(settings: Settings) {
    super();
    this.filters = new Routing.Router(settings);
    this.processors = new Routing.Router(settings);
  }

  /**
   * Decorates the specified member to filter an application request.
   * @param action Filter action settings.
   * @returns Returns the decorator method.
   */
  @Class.Public()
  public static Filter(action: Action): Aliases.MemberDecorator {
    return (prototype: any, property: string | Symbol, descriptor: PropertyDescriptor): void => {
      if (!(descriptor.value instanceof Function)) {
        throw new TypeError(`Only methods are allowed as filters.`);
      }
      this.addRoute(prototype.constructor, {
        type: Types.Route.Filter,
        action: action,
        method: <string>property
      });
    };
  }

  /**
   * Decorates the specified member to process an application request.
   * @param action Route action settings.
   * @returns Returns the decorator method.
   */
  @Class.Public()
  public static Processor(action: Action): Aliases.MemberDecorator {
    return (prototype: any, property: string | Symbol, descriptor: PropertyDescriptor): void => {
      if (!(descriptor.value instanceof Function)) {
        throw new TypeError(`Only methods are allowed as processors.`);
      }
      this.addRoute(prototype.constructor, {
        type: Types.Route.Processor,
        action: action,
        method: <string>property
      });
    };
  }
}
