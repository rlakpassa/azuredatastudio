/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { binarySearch } from 'vs/base/common/arrays';
import { Event } from 'vs/base/common/event';
import { URI } from 'vs/base/common/uri';
import { Range } from 'vs/editor/common/core/range';
import { IModelDeltaDecoration } from 'vs/editor/common/model';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ITestMessage } from 'vs/workbench/contrib/testing/common/testCollection';

export interface ITestingDecorationsService {
	_serviceBrand: undefined;

	/**
	 * Fires when something happened to change decorations in an editor.
	 * Interested consumers should call {@link syncDecorations} to update them.
	 */
	onDidChange: Event<void>;

	/**
	 * Signals the code underlying a test message has changed, and it should
	 * no longer be decorated in the source.
	 */
	invalidateResultMessage(message: ITestMessage): void;

	/**
	 * Ensures decorations in the given document URI are up to date,
	 * and returns them.
	 */
	syncDecorations(resource: URI): TestDecorations;

	/**
	 * Gets the range where a test ID is displayed, in the given URI.
	 * Returns undefined if there's no such decoration.
	 */
	getDecoratedRangeForTest(resource: URI, testId: string): Range | undefined;
}

export interface ITestDecoration {
	/**
	 * ID of the decoration after being added to the editor, set after the
	 * decoration is applied.
	 */
	readonly id: string;

	/**
	 * Original decoration line number.
	 */
	readonly line: number;

	/**
	 * Editor decoration instance.
	 */
	readonly editorDecoration: IModelDeltaDecoration;
}

export class TestDecorations<T extends { id: string; line: number } = ITestDecoration> {
	public value: T[] = [];

	private _idMap?: Map<string, T>;

	/**
	 * Looks up a decoration by ID.
	 */
	public get(decorationId: string) {
		if (this._idMap) {
			return this._idMap.get(decorationId);
		} else if (this.value.length > 16) {
			this._idMap = new Map();
			for (const value of this.value) { this._idMap.set(value.id, value); }
			return this._idMap.get(decorationId);
		} else {
			return this.value.find(v => v.id === decorationId);
		}
	}

	/**
	 * Adds a new value to the decorations.
	 */
	public push(value: T) {
		const searchIndex = binarySearch(this.value, value, (a, b) => a.line - b.line);
		this.value.splice(searchIndex < 0 ? ~searchIndex : searchIndex, 0, value);
		this._idMap = undefined;
	}

	/**
	 * Finds the value that exists on the given line, if any.
	 */
	public findOnLine(line: number, predicate: (value: T) => boolean): T | undefined {
		const lineStart = binarySearch<{ line: number }>(this.value, { line }, (a, b) => a.line - b.line);
		if (lineStart < 0) {
			return undefined;
		}

		for (let i = lineStart; i < this.value.length && this.value[i].line === line; i++) {
			if (predicate(this.value[i])) {
				return this.value[i];
			}
		}

		return undefined;
	}

	/**
	 * Gets decorations on each line.
	 */
	public *lines(): Iterable<[number, T[]]> {
		if (!this.value.length) {
			return;
		}

		let startIndex = 0;
		let startLine = this.value[0].line;
		for (let i = 1; i < this.value.length; i++) {
			const v = this.value[i];
			if (v.line !== startLine) {
				yield [startLine, this.value.slice(startIndex, i)];
				startLine = v.line;
				startIndex = i;
			}
		}

		yield [startLine, this.value.slice(startIndex)];
	}
}

export const ITestingDecorationsService = createDecorator<ITestingDecorationsService>('testingDecorationService');

