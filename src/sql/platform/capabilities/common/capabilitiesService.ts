/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as azdata from 'azdata';

import { Event } from 'vs/base/common/event';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import type { IDisposable } from 'vs/base/common/lifecycle';
import { URI } from 'vs/base/common/uri';
import { IconPath } from 'sql/platform/connection/common/connectionProfile';

export const SERVICE_ID = 'capabilitiesService';
export const HOST_NAME = 'azdata';
export const HOST_VERSION = '1.0';

export const clientCapabilities = {
	hostName: HOST_NAME,
	hostVersion: HOST_VERSION
};

/**
 * The map containing the connection provider names and the owning extensions.
 * This is to workaround the issue that we don't have the ability to store and query the information from extension gallery.
 */
export const ConnectionProviderAndExtensionMap = new Map<string, string>([
	['PGSQL', 'microsoft.azuredatastudio-postgresql'],
	['KUSTO', 'microsoft.kusto'],
	['LOGANALYTICS', 'microsoft.azuremonitor'],
	['COSMOSDB_MONGO', 'microsoft.azure-cosmosdb-ads-extension']
]);

/**
 * The connection string options for connection provider.
 */
export interface ConnectionStringOptions {
	/**
	 * Whether the connection provider supports connection string as an input option. The default value is false.
	 */
	isEnabled?: boolean;
	/**
	 * Whether the connection provider uses connection string as the default option to connect. The default value is false.
	 */
	isDefault?: boolean;
}

export interface ConnectionProviderProperties {
	providerId: string;
	iconPath?: URI | IconPath | { id: string, path: IconPath, default?: boolean }[]
	displayName: string;
	notebookKernelAlias?: string;
	azureResource?: string;
	connectionOptions: azdata.ConnectionOption[];
	isQueryProvider?: boolean;
	supportedExecutionPlanFileExtensions?: string[];
	connectionStringOptions?: ConnectionStringOptions;
}

export interface ProviderFeatures {
	connection: ConnectionProviderProperties;
}


export const ICapabilitiesService = createDecorator<ICapabilitiesService>(SERVICE_ID);

/**
 * Interface for managing provider capabilities
 */
export interface ICapabilitiesService {
	_serviceBrand: undefined;

	/**
	 * Retrieve a list of registered capabilities providers
	 */
	getCapabilities(provider: string): ProviderFeatures | undefined;

	/**
	 * get the old version of provider information
	 */
	getLegacyCapabilities(provider: string): azdata.DataProtocolServerCapabilities | undefined;

	/**
	 * Register a capabilities provider
	 */
	registerProvider(provider: azdata.CapabilitiesProvider): void;

	/**
	 * When new capabilities are registered, it emits the @see ProviderFeatures, which can be used to get the new capabilities
	 */
	readonly onCapabilitiesRegistered: Event<{ id: string; features: ProviderFeatures }>;

	/**
	 * Get an array of all known providers
	 */
	readonly providers: { [id: string]: ProviderFeatures };

	registerConnectionProvider(id: string, properties: ConnectionProviderProperties): IDisposable;

}
