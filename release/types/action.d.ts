/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
import * as Aliases from './aliases';

/**
 * Application actions interface.
 */
export interface Action {
  /**
   * Action path.
   */
  path: string;
  /**
   * Determines whether the action path must be exact or not.
   */
  exact?: boolean;
  /**
   * Action path constraint.
   */
  constraint?: Aliases.Constraint;
  /**
   * Action environment.
   */
  environment?: Aliases.Variables;
}
