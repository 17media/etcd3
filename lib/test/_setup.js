"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const shared_pool_1 = require("../src/shared-pool");
chai.use(require('chai-subset')); // tslint:disable-line
chai.use(require('chai-as-promised')); // tslint:disable-line
shared_pool_1.SharedPool.deterministicInsertion = true;
