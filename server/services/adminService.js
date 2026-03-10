/**
 * Admin service facade: re-exports from scoped services (admin/*).
 * Use adminUsersService, adminOrdersService, adminProductsService, adminPlatformService directly when possible.
 */

import * as adminUsersService from './admin/adminUsersService.js';
import * as adminOrdersService from './admin/adminOrdersService.js';
import * as adminProductsService from './admin/adminProductsService.js';
import * as adminPlatformService from './admin/adminPlatformService.js';

export const listUsers = adminUsersService.listUsers;
export const updateUserStatus = adminUsersService.updateUserStatus;
export const softDeleteUser = adminUsersService.softDeleteUser;
export const restoreUser = adminUsersService.restoreUser;
export const listOrders = adminOrdersService.listOrders;
export const listProducts = adminProductsService.listProducts;
export const adminUpdateProduct = adminProductsService.adminUpdateProduct;
export const adminDeleteProduct = adminProductsService.adminDeleteProduct;
export const getPlatformEarnings = adminPlatformService.getPlatformEarnings;
