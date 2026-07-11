import { SchedulerData, EventItem } from "react-big-schedule";
import { SchedulerAction } from "../../types";

/**
 * Fires when the RIGHT edge of a chip is dragged (end-time resize).
 * Signature: updateEventEnd(schedulerData, event, newEnd)
 * The resource does not change, so we report the event's current resourceId.
 */
export function createUpdateEventEndCallback(
    dispatch: (action: SchedulerAction) => void,
    onMoveEvent?: (recordId: string, resourceId: string, start: Date, end: Date) => void
) {
    return (schedulerData: SchedulerData, event: EventItem, newEnd: string) => {
        schedulerData.updateEventEnd(event, newEnd);
        dispatch({ type: "UPDATE_SCHEDULER", payload: schedulerData });

        if (onMoveEvent) {
            const e = event as unknown as { id: string | number; resourceId: string; start: string };
            onMoveEvent(String(e.id), String(e.resourceId), new Date(e.start), new Date(newEnd));
        }
    };
}
