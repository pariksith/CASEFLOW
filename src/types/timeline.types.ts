export interface TimelineEvent {
  id?: string;
  case_id?: string;
  event_date: string;
  event_description: string;
  is_approximate: boolean;
  sequence_order?: number;
}

export interface AITimelineResponse {
  events: TimelineEvent[];
}
