import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AIChatRequest {
  message: string;
}

export interface AIChatResponse {
  response: string;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AIToolsResponse {
  tools: AITool[];
}

@Injectable({ providedIn: 'root' })
export class AiApi extends ApiService {
  chat(message: string): Observable<AIChatResponse> {
    return this.post<AIChatResponse>('/ai/chat', { message });
  }

  getTools(): Observable<AIToolsResponse> {
    return this.get<AIToolsResponse>('/ai/tools');
  }
}