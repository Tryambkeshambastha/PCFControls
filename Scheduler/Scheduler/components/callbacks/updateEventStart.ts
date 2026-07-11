import { SchedulerData, EventItem } from "react-big-schedule";
import { SchedulerAction } from "../../types";

/**
 * Fires when the LEFT edge of a chip is dragged (start-time resize).
 * Signature: updateEventStart(schedulerData, event, newStart)
 * The resource does not change, so we report the event's current resourceId.
 */
export function createUpdateEventStartCallback(
    dispatch: (action: SchedulerAction) => void,
    onMoveEvent?: (recordId: string, resourceId: string, start: Date, end: Date) => void
) {
    return (schedulerData: SchedulerData, event: EventItem, newStart: string) => {
        schedulerData.updateEventStart(event, newStart);
        dispatch({ type: "UPDATE_SCHEDULER", payload: schedulerData });

        if (onMoveEvent) {
            const e = event as unknown as { id: string | number; resourceId: string; end: string };
            onMoveEvent(String(e.id), String(e.resourceId), new Date(newStart), new Date(e.end));
        }
    };
}
