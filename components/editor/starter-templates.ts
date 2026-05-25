import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeColorId,
  type CanvasNodeShape,
} from "@/types/canvas"

interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

interface TemplateNodeInput {
  id: string
  label: string
  color: CanvasNodeColorId
  shape: CanvasNodeShape
  x: number
  y: number
  width: number
  height: number
}

type EdgeSide = "top" | "right" | "bottom" | "left"

function createTemplateNode({
  id,
  label,
  color,
  shape,
  x,
  y,
  width,
  height,
}: TemplateNodeInput): CanvasNode {
  return {
    id,
    type: CANVAS_NODE_TYPE,
    position: { x, y },
    width,
    height,
    data: {
      label,
      color,
      shape,
    },
  }
}

function createTemplateEdge({
  id,
  source,
  target,
  sourceSide = "right",
  targetSide = "left",
  label = "",
}: {
  id: string
  source: string
  target: string
  sourceSide?: EdgeSide
  targetSide?: EdgeSide
  label?: string
}): CanvasEdge {
  return {
    id,
    source,
    sourceHandle: `${sourceSide}-source`,
    target,
    targetHandle: `${targetSide}-target`,
    type: CANVAS_EDGE_TYPE,
    data: {
      label,
    },
  }
}

const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices-commerce",
    name: "Microservices Commerce",
    description:
      "API gateway, domain services, isolated stores, and an async event stream for order activity.",
    nodes: [
      createTemplateNode({
        id: "client-app",
        label: "Client App",
        color: "blue",
        shape: "hexagon",
        x: -440,
        y: -44,
        width: 136,
        height: 88,
      }),
      createTemplateNode({
        id: "api-gateway",
        label: "API Gateway",
        color: "amber",
        shape: "pill",
        x: -210,
        y: -36,
        width: 144,
        height: 72,
      }),
      createTemplateNode({
        id: "auth-service",
        label: "Auth Service",
        color: "violet",
        shape: "pill",
        x: 30,
        y: -166,
        width: 144,
        height: 72,
      }),
      createTemplateNode({
        id: "catalog-service",
        label: "Catalog Service",
        color: "teal",
        shape: "pill",
        x: 30,
        y: -36,
        width: 144,
        height: 72,
      }),
      createTemplateNode({
        id: "order-service",
        label: "Order Service",
        color: "green",
        shape: "pill",
        x: 30,
        y: 94,
        width: 144,
        height: 72,
      }),
      createTemplateNode({
        id: "users-db",
        label: "Users DB",
        color: "violet",
        shape: "cylinder",
        x: 290,
        y: -174,
        width: 120,
        height: 88,
      }),
      createTemplateNode({
        id: "catalog-db",
        label: "Catalog DB",
        color: "teal",
        shape: "cylinder",
        x: 290,
        y: -44,
        width: 120,
        height: 88,
      }),
      createTemplateNode({
        id: "orders-db",
        label: "Orders DB",
        color: "green",
        shape: "cylinder",
        x: 290,
        y: 86,
        width: 120,
        height: 88,
      }),
      createTemplateNode({
        id: "order-events",
        label: "Order Events",
        color: "amber",
        shape: "circle",
        x: 306,
        y: 214,
        width: 88,
        height: 88,
      }),
    ],
    edges: [
      createTemplateEdge({
        id: "client-to-gateway",
        source: "client-app",
        target: "api-gateway",
        label: "HTTPS",
      }),
      createTemplateEdge({
        id: "gateway-to-auth",
        source: "api-gateway",
        target: "auth-service",
        targetSide: "left",
      }),
      createTemplateEdge({
        id: "gateway-to-catalog",
        source: "api-gateway",
        target: "catalog-service",
      }),
      createTemplateEdge({
        id: "gateway-to-orders",
        source: "api-gateway",
        target: "order-service",
      }),
      createTemplateEdge({
        id: "auth-to-users",
        source: "auth-service",
        target: "users-db",
      }),
      createTemplateEdge({
        id: "catalog-to-db",
        source: "catalog-service",
        target: "catalog-db",
      }),
      createTemplateEdge({
        id: "orders-to-db",
        source: "order-service",
        target: "orders-db",
      }),
      createTemplateEdge({
        id: "orders-to-events",
        source: "order-service",
        target: "order-events",
        sourceSide: "bottom",
        targetSide: "left",
        label: "publish",
      }),
    ],
  },
  {
    id: "ci-cd-pipeline",
    name: "CI/CD Pipeline",
    description:
      "Source control through build, test, artifact promotion, deployment, and production telemetry.",
    nodes: [
      createTemplateNode({
        id: "developer",
        label: "Developer",
        color: "blue",
        shape: "hexagon",
        x: -430,
        y: -34,
        width: 124,
        height: 76,
      }),
      createTemplateNode({
        id: "git-repository",
        label: "Git Repository",
        color: "teal",
        shape: "cylinder",
        x: -228,
        y: -42,
        width: 132,
        height: 88,
      }),
      createTemplateNode({
        id: "ci-runner",
        label: "CI Runner",
        color: "amber",
        shape: "pill",
        x: -18,
        y: -34,
        width: 132,
        height: 68,
      }),
      createTemplateNode({
        id: "test-gate",
        label: "Test Gate",
        color: "violet",
        shape: "diamond",
        x: 190,
        y: -52,
        width: 104,
        height: 104,
      }),
      createTemplateNode({
        id: "artifact-registry",
        label: "Artifact Registry",
        color: "green",
        shape: "cylinder",
        x: 398,
        y: -42,
        width: 140,
        height: 88,
      }),
      createTemplateNode({
        id: "deploy-gate",
        label: "Deploy Gate",
        color: "red",
        shape: "diamond",
        x: 190,
        y: 130,
        width: 104,
        height: 104,
      }),
      createTemplateNode({
        id: "production",
        label: "Production",
        color: "teal",
        shape: "hexagon",
        x: 398,
        y: 146,
        width: 140,
        height: 72,
      }),
      createTemplateNode({
        id: "observability",
        label: "Observability",
        color: "neutral",
        shape: "rectangle",
        x: 402,
        y: 296,
        width: 132,
        height: 68,
      }),
    ],
    edges: [
      createTemplateEdge({
        id: "developer-to-repo",
        source: "developer",
        target: "git-repository",
        label: "push",
      }),
      createTemplateEdge({
        id: "repo-to-ci",
        source: "git-repository",
        target: "ci-runner",
        label: "webhook",
      }),
      createTemplateEdge({
        id: "ci-to-test",
        source: "ci-runner",
        target: "test-gate",
      }),
      createTemplateEdge({
        id: "test-to-registry",
        source: "test-gate",
        target: "artifact-registry",
        label: "pass",
      }),
      createTemplateEdge({
        id: "registry-to-deploy",
        source: "artifact-registry",
        target: "deploy-gate",
        sourceSide: "bottom",
        targetSide: "top",
      }),
      createTemplateEdge({
        id: "deploy-to-prod",
        source: "deploy-gate",
        target: "production",
        sourceSide: "right",
        targetSide: "left",
        label: "release",
      }),
      createTemplateEdge({
        id: "prod-to-observability",
        source: "production",
        target: "observability",
        sourceSide: "bottom",
        targetSide: "top",
        label: "metrics",
      }),
    ],
  },
  {
    id: "event-driven-system",
    name: "Event-Driven System",
    description:
      "Ingress service, brokered events, independent consumers, data lake, and external notification delivery.",
    nodes: [
      createTemplateNode({
        id: "web-mobile",
        label: "Web + Mobile",
        color: "blue",
        shape: "hexagon",
        x: -438,
        y: -42,
        width: 140,
        height: 84,
      }),
      createTemplateNode({
        id: "ingress-api",
        label: "Ingress API",
        color: "amber",
        shape: "pill",
        x: -216,
        y: -34,
        width: 136,
        height: 68,
      }),
      createTemplateNode({
        id: "event-bus",
        label: "Event Bus",
        color: "teal",
        shape: "circle",
        x: 0,
        y: -48,
        width: 96,
        height: 96,
      }),
      createTemplateNode({
        id: "checkout-worker",
        label: "Checkout Worker",
        color: "green",
        shape: "pill",
        x: 222,
        y: -168,
        width: 150,
        height: 68,
      }),
      createTemplateNode({
        id: "billing-worker",
        label: "Billing Worker",
        color: "violet",
        shape: "pill",
        x: 222,
        y: -34,
        width: 150,
        height: 68,
      }),
      createTemplateNode({
        id: "warehouse-worker",
        label: "Warehouse Worker",
        color: "rose",
        shape: "pill",
        x: 222,
        y: 100,
        width: 150,
        height: 68,
      }),
      createTemplateNode({
        id: "data-lake",
        label: "Data Lake",
        color: "neutral",
        shape: "cylinder",
        x: 456,
        y: -44,
        width: 126,
        height: 88,
      }),
      createTemplateNode({
        id: "notification-service",
        label: "Notification Service",
        color: "red",
        shape: "rectangle",
        x: 444,
        y: 126,
        width: 150,
        height: 72,
      }),
      createTemplateNode({
        id: "email-provider",
        label: "Email Provider",
        color: "blue",
        shape: "hexagon",
        x: 684,
        y: 120,
        width: 136,
        height: 84,
      }),
    ],
    edges: [
      createTemplateEdge({
        id: "clients-to-ingress",
        source: "web-mobile",
        target: "ingress-api",
        label: "commands",
      }),
      createTemplateEdge({
        id: "ingress-to-bus",
        source: "ingress-api",
        target: "event-bus",
        label: "events",
      }),
      createTemplateEdge({
        id: "bus-to-checkout",
        source: "event-bus",
        target: "checkout-worker",
        sourceSide: "right",
        targetSide: "left",
      }),
      createTemplateEdge({
        id: "bus-to-billing",
        source: "event-bus",
        target: "billing-worker",
        sourceSide: "right",
        targetSide: "left",
      }),
      createTemplateEdge({
        id: "bus-to-warehouse",
        source: "event-bus",
        target: "warehouse-worker",
        sourceSide: "right",
        targetSide: "left",
      }),
      createTemplateEdge({
        id: "checkout-to-lake",
        source: "checkout-worker",
        target: "data-lake",
        sourceSide: "right",
        targetSide: "top",
      }),
      createTemplateEdge({
        id: "billing-to-lake",
        source: "billing-worker",
        target: "data-lake",
      }),
      createTemplateEdge({
        id: "warehouse-to-notifications",
        source: "warehouse-worker",
        target: "notification-service",
      }),
      createTemplateEdge({
        id: "notifications-to-provider",
        source: "notification-service",
        target: "email-provider",
        label: "deliver",
      }),
    ],
  },
]

export { CANVAS_TEMPLATES, type CanvasTemplate }
