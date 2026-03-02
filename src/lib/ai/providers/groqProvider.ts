import { AIProvider } from '@/types';
import { sanitizeBpmnNamespaces } from '@/lib/bpmn/sanitize';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const BPMN_EXAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="Process_1" isExecutable="true">
    <startEvent id="Start_1" name="Start" />
    <task id="Task_1" name="Do Something" />
    <endEvent id="End_1" name="End" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_1" />
    <sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="End_1" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="180" y="200" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="280" y="178" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="450" y="200" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="216" y="218" />
        <di:waypoint x="280" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="218" />
        <di:waypoint x="450" y="218" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

const SYSTEM_PROMPT = `You are a BPMN 2.0 XML generator. Return ONLY valid, complete BPMN 2.0 XML.

CRITICAL RULES:
1. You MUST include a <bpmndi:BPMNDiagram> section with BPMNShape for every node and BPMNEdge for every sequenceFlow. Without this, the diagram CANNOT render.
2. Every BPMNShape needs <dc:Bounds x="" y="" width="" height="" />
3. Every BPMNEdge needs <di:waypoint> elements
4. Start with <?xml version="1.0" encoding="UTF-8"?>
5. Use these namespaces on <definitions>:
   xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
   xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
   xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
   xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
6. Every <sequenceFlow> MUST have both sourceRef and targetRef attributes pointing to valid element IDs.
7. Do NOT wrap in markdown. No explanations. ONLY the XML.

LAYOUT RULES (VERY IMPORTANT — elements must NEVER overlap):
- Element sizes: Events width=36 height=36, Tasks width=100 height=80, Gateways width=50 height=50.
- Main flow axis: left-to-right. Start at x=180.
- Horizontal spacing: leave at least 70px gap between the right edge of one element and the left edge of the next. For a task (width=100) at x=280, the next element starts at x=280+100+70=450 minimum.
- Center all elements vertically on the same baseline. Use y=200 as the center line. Tasks: y=178 (center at 218). Events: y=200 (center at 218). Gateways: y=193 (center at 218).
- When a gateway branches into parallel paths, offset each branch vertically by at least 120px:
  - Upper branch: y_center = 218 - 120 = 98 (tasks at y=58)
  - Main branch: y_center = 218 (tasks at y=178)
  - Lower branch: y_center = 218 + 120 = 338 (tasks at y=298)
- For edges connecting elements on the same row, use a straight horizontal line (same y for both waypoints).
- For edges connecting elements on different rows, use intermediate waypoints to create clean orthogonal routes (horizontal then vertical then horizontal). Never draw diagonal lines.
- After a branching gateway, place each branch's tasks in their own row. After all branches complete, place the merge gateway/join at the x position after the longest branch.
- Leave enough horizontal space so labels (element names) do not overlap adjacent elements. If a task name is long, add 20-30px extra spacing.
- Double-check: no two BPMNShape elements should have overlapping Bounds rectangles.

Here is an example of correct output format:
${BPMN_EXAMPLE}

Follow this exact structure. Always include the bpmndi:BPMNDiagram section.`;

export class GroqProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY!;
    this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not defined');
    }
  }

  async generateBpmnXML(input: { currentXml?: string; prompt: string }): Promise<string> {
    let userPrompt: string;

    if (input.currentXml) {
      userPrompt = `Here is the current BPMN XML:\n\n${input.currentXml}\n\nModify it according to this request: ${input.prompt}\n\nReturn the complete modified BPMN XML including the full bpmndi:BPMNDiagram section. Ensure all elements are well-spaced with no overlapping, properly aligned, and easy to read. Use clean orthogonal routing for all edges.`;
    } else {
      userPrompt = `Generate a complete BPMN 2.0 XML for: ${input.prompt}\n\nInclude the full bpmndi:BPMNDiagram section with BPMNShape and BPMNEdge for every element. Ensure all elements are well-spaced with no overlapping, properly aligned on a clean grid, and easy to read. Use clean orthogonal routing for all edges. Return only the XML.`;
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Groq API');
    }

    const xml = this.extractXml(content);
    const fixed = sanitizeBpmnNamespaces(xml);
    return this.ensureDiagram(fixed);
  }

  private extractXml(content: string): string {
    let cleaned = content
      .replace(/^```(?:xml|bpmn)?\s*\n?/gm, '')
      .replace(/\n?```\s*$/gm, '')
      .trim();

    const fullMatch = cleaned.match(/<\?xml[\s\S]*<\/definitions>/i);
    if (fullMatch) return fullMatch[0].trim();

    const defMatch = cleaned.match(/<definitions[\s\S]*<\/definitions>/i);
    if (defMatch) {
      return `<?xml version="1.0" encoding="UTF-8"?>\n${defMatch[0].trim()}`;
    }

    if (cleaned.startsWith('<?xml') || cleaned.startsWith('<definitions')) {
      return cleaned;
    }

    const rawMatch = content.match(/<\??(?:xml|definitions)[\s\S]*<\/definitions>/i);
    if (rawMatch) return rawMatch[0].trim();

    throw new Error(
      'Groq did not return valid BPMN XML. Try a more specific prompt like "Create a process with a start event, a script task called Process Data, and an end event".'
    );
  }

  /**
   * If the AI forgot the BPMNDiagram section, generate one from the process elements.
   * This ensures bpmn-js can always render the diagram.
   */
  private ensureDiagram(xml: string): string {
    if (xml.includes('bpmndi:BPMNDiagram') || xml.includes('BPMNDiagram')) {
      return xml;
    }

    // Extract element IDs from the process
    const elementIds: { id: string; type: 'shape' | 'edge' }[] = [];
    const idMatches = xml.matchAll(/<(startEvent|endEvent|task|userTask|serviceTask|scriptTask|exclusiveGateway|parallelGateway|inclusiveGateway|subProcess|callActivity|intermediateCatchEvent|intermediateThrowEvent|boundaryEvent|receiveTask|sendTask|manualTask|businessRuleTask)\s[^>]*id="([^"]+)"/gi);
    for (const m of idMatches) {
      elementIds.push({ id: m[2], type: 'shape' });
    }

    const flowMatches = xml.matchAll(/<sequenceFlow\s[^>]*id="([^"]+)"[^>]*sourceRef="([^"]+)"[^>]*targetRef="([^"]+)"/gi);
    const flows: { id: string; sourceRef: string; targetRef: string }[] = [];
    for (const m of flowMatches) {
      flows.push({ id: m[1], sourceRef: m[2], targetRef: m[3] });
      elementIds.push({ id: m[1], type: 'edge' });
    }

    let x = 180;
    const centerY = 218;
    const shapes: string[] = [];
    const edges: string[] = [];
    const positions = new Map<string, { cx: number; cy: number }>();

    for (const el of elementIds) {
      if (el.type === 'shape') {
        const isEvent = xml.match(new RegExp(`<(?:startEvent|endEvent|intermediateCatchEvent|intermediateThrowEvent|boundaryEvent)\\s[^>]*id="${el.id}"`));
        const isGateway = xml.match(new RegExp(`<(?:exclusiveGateway|parallelGateway|inclusiveGateway)\\s[^>]*id="${el.id}"`));

        const w = isEvent ? 36 : isGateway ? 50 : 100;
        const h = isEvent ? 36 : isGateway ? 50 : 80;
        const shapeY = centerY - h / 2;

        shapes.push(
          `      <bpmndi:BPMNShape id="${el.id}_di" bpmnElement="${el.id}">
        <dc:Bounds x="${x}" y="${shapeY}" width="${w}" height="${h}" />
      </bpmndi:BPMNShape>`
        );
        positions.set(el.id, { cx: x + w / 2, cy: centerY });
        x += w + 70;
      }
    }

    for (const flow of flows) {
      const src = positions.get(flow.sourceRef) ?? { cx: 200, cy: centerY };
      const tgt = positions.get(flow.targetRef) ?? { cx: 400, cy: centerY };
      edges.push(
        `      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">
        <di:waypoint x="${src.cx}" y="${src.cy}" />
        <di:waypoint x="${tgt.cx}" y="${tgt.cy}" />
      </bpmndi:BPMNEdge>`
      );
    }

    // Find the process ID
    const processIdMatch = xml.match(/<process\s[^>]*id="([^"]+)"/);
    const processId = processIdMatch?.[1] || 'Process_1';

    const diagramXml = `
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
${shapes.join('\n')}
${edges.join('\n')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>`;

    return xml.replace('</definitions>', `${diagramXml}\n</definitions>`);
  }
}
