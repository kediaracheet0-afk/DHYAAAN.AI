export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  suggestedTools?: string[];
}

export interface AppState {
  tasks: Task[];
  isFocusMode: boolean;
  activeTaskId: string | null;
}
