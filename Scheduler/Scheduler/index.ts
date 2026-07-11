import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { v4 as uuidv4 } from "uuid";
import { SchedulerApp } from "./schedulerApp";

export class Scheduler implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _calculatedHeight: number;
    private _context: ComponentFramework.Context<IInputs>;
    private _notifyOutputChanged: () => void;
    private _instanceId: string;
    private _actionRecordSelected: boolean;
    private _selectedRecordId: string;
    private _currentRangeStart: Date;
    private _currentRangeEnd: Date;
    private _currentSchedulerDate: Date;
    private _currentSchedulerView: string;
    private _updateFromOutput: boolean;
    private _reactRoot: ReactDOM.Root;
    private _actionSlotSelected: boolean;
    private _actionNewEvent: boolean;
    private _selectedSlotId: string;
    private _selectedSlotStart: Date;
    private _selectedSlotEnd: Date;

    // --- NEW: drag-move / resize action state ------------------------------
    private _actionEventMoved: boolean;
    private _movedRecordId: string;
    private _movedResourceId: string;
    private _movedStart: Date;
    private _movedEnd: Date;
    // -----------------------------------------------------------------------

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        context.mode.trackContainerResize(true);
        this._notifyOutputChanged = notifyOutputChanged;
        this._updateFromOutput = false;
        this._context = context;
        this._container = container;
        this._instanceId = uuidv4();
        this._reactRoot = ReactDOM.createRoot(this._container);
        this._actionRecordSelected = false;
        this._selectedRecordId = '';
        this._actionSlotSelected = false;
        this._selectedSlotId = '';
        this._actionNewEvent = false;
        this._actionEventMoved = false; // NEW

        if (this._context.mode.allocatedHeight !== -1) {
            this._container.style.height = `${(this._context.mode.allocatedHeight).toString()}px`;
        } else {
            //@ts-expect-error - we are setting the height of the container to 100% if we are in a model driven app
            this._container.style.height = this._context.mode?.rowSpan ? `${(this._context.mode.rowSpan * 1.5).toString()}em` : "100%";
        }
        this._container.style.zIndex = "0";
        context.parameters.schedulerDataSet.paging.setPageSize(5000);
    }

    public onDateChange(date: Date, rangeStart: Date, rangeEnd: Date, view: string): void {
        this._currentSchedulerDate = date;
        this._currentRangeStart = rangeStart;
        this._currentRangeEnd = rangeEnd;
        this._currentSchedulerView = view;
        this._notifyOutputChanged();
    }

    public onClickSelectedRecord(recordId: string) {
        this._selectedRecordId = recordId;
        this._actionRecordSelected = true;
        this._notifyOutputChanged();
    }

    public onClickSelectedSlot(slotId: string) {
        this._selectedSlotId = slotId;
        this._actionSlotSelected = true;
        this._notifyOutputChanged();
    }

    public onNewEvent(slotId: string, start: Date, end: Date) {
        this._selectedSlotId = slotId;
        this._selectedSlotStart = start;
        this._selectedSlotEnd = end;
        this._actionNewEvent = true;
        this._notifyOutputChanged();
    }

    /**
     * NEW — fired when an existing chip is dragged to a new time/resource
     * (or resized). Surfaces the moved record id, the target resource id and
     * the new start/end so a Canvas app can Patch the underlying record.
     */
    public onMoveEvent(recordId: string, resourceId: string, start: Date, end: Date) {
        this._movedRecordId = recordId;
        this._movedResourceId = resourceId;
        this._movedStart = start;
        this._movedEnd = end;
        this._actionEventMoved = true;
        this._notifyOutputChanged();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        if (this._updateFromOutput) {
            this._updateFromOutput = false;
            return;
        }
        const dataSet = context.parameters.schedulerDataSet;
        if (this._context.mode.allocatedHeight !== -1) {
            this._container.style.height = `${(this._context.mode.allocatedHeight).toString()}px`;
        } else {
            //@ts-expect-error - we are setting the height of the container to 100% if we are in a model driven app
            this._container.style.height = this._context.mode?.rowSpan ? `${(this._context.mode.rowSpan * 1.5).toString()}em` : "100%";
        }
        if (dataSet.loading) return;
        if (this._context.mode.allocatedHeight === -1 && dataSet.paging.hasNextPage) {
            dataSet.paging.loadNextPage();
            return;
        }

        // Render the SchedulerApp with the generated instanceId
        this._reactRoot.render(
            React.createElement(SchedulerApp, {
                context: this._context,
                instanceid: this._instanceId,
                height: this._context.parameters.showSchedulerHeader?.raw == true
                    ? this._context.mode.allocatedHeight - 60
                    : this._context.mode.allocatedHeight,
                onDateChange: this.onDateChange.bind(this),
                onClickSelectedRecord: this.onClickSelectedRecord.bind(this),
                onClickSelectedSlot: this.onClickSelectedSlot.bind(this),
                onNewEvent: this.onNewEvent.bind(this),
                onMoveEvent: this.onMoveEvent.bind(this), // NEW
            })
        );
    }

    public getOutputs(): IOutputs {
        this._updateFromOutput = true;
        let notifyAgain = false;
        const output: IOutputs = {
            currentRangeStart: this._currentRangeStart,
            currentRangeEnd: this._currentRangeEnd,
            currentSchedulerDate: this._currentSchedulerDate,
            currentSchedulerView: this._currentSchedulerView,
            actionRecordSelected: this._actionRecordSelected,
            actionEventMoved: this._actionEventMoved // NEW
        };

        if (this._actionRecordSelected) {
            notifyAgain = true;
            output.selectedRecordId = this._selectedRecordId;
            this._actionRecordSelected = false;
        }
        if (this._actionSlotSelected) {
            notifyAgain = true;
            output.selectedSlotId = this._selectedSlotId;
            this._actionSlotSelected = false;
        }
        if (this._actionNewEvent) {
            notifyAgain = true;
            output.selectedSlotId = this._selectedSlotId;
            output.selectedSlotStart = this._selectedSlotStart;
            output.selectedSlotEnd = this._selectedSlotEnd;
            this._actionNewEvent = false;
        }
        // NEW — event moved / resized
        if (this._actionEventMoved) {
            notifyAgain = true;
            output.movedRecordId = this._movedRecordId;
            output.movedResourceId = this._movedResourceId;
            output.movedStart = this._movedStart;
            output.movedEnd = this._movedEnd;
            this._actionEventMoved = false;
        }

        if (notifyAgain) {
            this._notifyOutputChanged();
        }
        return output;
    }

    public destroy(): void {
        // Unmount the React app
        this._reactRoot.unmount();
    }
}
