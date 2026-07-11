import { SchedulerData, EventItem } from "react-big-schedule";
import { SchedulerAction } from "../../types";

/**
 * Fires when an existing event chip is dragged to a new time and/or resource.
 *
 * react-big-schedule callback signature (verified against the library API):
 *   moveEvent(schedulerData, event, slotId, slotName, newStart, newEnd)
 *     - event    : the EventItem being dragged (event.id === your eventId column)
 *     - slotId   : the resource row it was dropped on (the NEW resource id)
 *     - newStart / newEnd : "YYYY-MM-DD HH:mm:ss" strings (local wall-clock)
 *
 * We move the chip optimistically in the UI and then bubble the change up to
 * the PCF host via onMoveEvent so the Canvas app can Patch the record.
 *
 * NOTE: `event` is typed exactly as EventItem to match SchedulerProps and avoid
 * strictFunctionTypes variance errors; fields are read via a narrow cast.
 */
export function createMoveEventCallback(
    dispatch: (action: SchedulerAction) => void,
    onMoveEvent?: (recordId: string, resourceId: string, start: Date, end: Date) => void
) {
    return (
        schedulerData: SchedulerData,
        event: EventItem,
        slotId: string,
        slotName: string,
        newStart: string,
        newEnd: string
    ) => {
        // Optimistic UI move.
        schedulerData.moveEvent(event, slotId, slotName, newStart, newEnd);
        dispatch({ type: "UPDATE_SCHEDULER", payload: schedulerData });

        // Notify PCF -> Canvas.
        if (onMoveEvent) {
            const e = event as unknown as { id: string | number };
            onMoveEvent(String(e.id), slotId, new Date(newStart), new Date(newEnd));
        }
    };
}
