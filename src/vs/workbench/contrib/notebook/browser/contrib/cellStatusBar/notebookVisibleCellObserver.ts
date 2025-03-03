/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { diffSets } from 'vs/base/common/collections';
import { Emitter } from 'vs/base/common/event';
import { Disposable, DisposableStore } from 'vs/base/common/lifecycle';
import { isDefined } from 'vs/base/common/types';
import { INotebookEditor } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { CellViewModel } from 'vs/workbench/contrib/notebook/browser/viewModel/notebookViewModel';
import { cellRangesToIndexes } from 'vs/workbench/contrib/notebook/common/notebookRange';

export interface ICellVisibilityChangeEvent {
	added: CellViewModel[];
	removed: CellViewModel[];
}

export class NotebookVisibleCellObserver extends Disposable {
	private readonly _onDidChangeVisibleCells = this._register(new Emitter<ICellVisibilityChangeEvent>());
	readonly onDidChangeVisibleCells = this._onDidChangeVisibleCells.event;

	private readonly _viewModelDisposables = this._register(new DisposableStore());

	private _visibleCells: CellViewModel[] = [];

	get visibleCells(): CellViewModel[] {
		return this._visibleCells;
	}

	constructor(private readonly _notebookEditor: INotebookEditor) {
		super();

		this._register(this._notebookEditor.onDidChangeVisibleRanges(this._updateVisibleCells, this));
		this._register(this._notebookEditor.onDidChangeModel(this._onModelChange, this));
		this._updateVisibleCells();
	}

	private _onModelChange() {
		this._viewModelDisposables.clear();
		if (this._notebookEditor.hasModel()) {
			this._viewModelDisposables.add(this._notebookEditor.onDidChangeViewCells(() => this.updateEverything()));
		}

		this.updateEverything();
	}

	protected updateEverything(): void {
		this._onDidChangeVisibleCells.fire({ added: [], removed: Array.from(this._visibleCells) });
		this._visibleCells = [];
		this._updateVisibleCells();
	}

	private _updateVisibleCells(): void {
		if (!this._notebookEditor.hasModel()) {
			return;
		}

		const rangesWithEnd = this._notebookEditor.visibleRanges
			.map(range => ({ start: range.start, end: range.end + 1 }));
		const newVisibleCells = cellRangesToIndexes(rangesWithEnd)
			.map(index => this._notebookEditor.cellAt(index) as CellViewModel)
			.filter(isDefined);
		const newVisibleHandles = new Set(newVisibleCells.map(cell => cell.handle));
		const oldVisibleHandles = new Set(this._visibleCells.map(cell => cell.handle));
		const diff = diffSets(oldVisibleHandles, newVisibleHandles);

		const added = diff.added
			.map(handle => this._notebookEditor.getCellByHandle(handle) as CellViewModel)
			.filter(isDefined);
		const removed = diff.removed
			.map(handle => this._notebookEditor.getCellByHandle(handle) as CellViewModel)
			.filter(isDefined);

		this._visibleCells = newVisibleCells;
		this._onDidChangeVisibleCells.fire({
			added,
			removed
		});
	}
}
