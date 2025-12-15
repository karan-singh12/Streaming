import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import appRoot from "app-root-path";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "streaming LIVE API Documentation",
      version: "1.0.0",
      description:
        "Comprehensive API documentation for streaming LIVE video streaming platform. This API supports admin management, user management, streaming, membership plans, CMS, and more.",
      contact: {
        name: "streaming LIVE Support",
        email: "support@streaminglive.com",
      },
      license: {
        name: "ISC",
      },
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:3003",
        description: "Development server",
      },
      {
        url: "https://streaming-api.devtechnosys.tech",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token obtained from login endpoint",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            statusCode: {
              type: "number",
              example: 400,
            },
            message: {
              type: "string",
              example: "Error message",
            },
            errors: {
              type: "array",
              items: {
                type: "object",
              },
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            statusCode: {
              type: "number",
              example: 200,
            },
            message: {
              type: "string",
              example: "Success message",
            },
            data: {
              type: "object",
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            pageNumber: {
              type: "number",
              example: 1,
            },
            pageSize: {
              type: "number",
              example: 10,
            },
            totalRecords: {
              type: "number",
              example: 100,
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: {
              type: "number",
              example: 1,
            },
            nickname: {
              type: "string",
              example: "john_doe",
            },
            email_address: {
              type: "string",
              example: "user@example.com",
            },
            avatar: {
              type: "string",
              nullable: true,
              example: "/public/user/avatar.jpg",
            },
            status: {
              type: "number",
              example: 1,
              description: "0 = inactive, 1 = active, 2 = deleted",
            },
            membership_type: {
              type: "string",
              example: "premium",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Streamer: {
          type: "object",
          properties: {
            id: {
              type: "number",
              example: 1,
            },
            user_id: {
              type: "number",
              example: 5,
            },
            uniqueId: {
              type: "string",
              example: "001",
            },
            thumbnail: {
              type: "string",
              nullable: true,
            },
            theme_description: {
              type: "string",
              nullable: true,
            },
            is_online: {
              type: "boolean",
              example: false,
            },
            username: {
              type: "string",
              example: "streamer_01",
            },
            email: {
              type: "string",
              example: "streamer@example.com",
            },
            status: {
              type: "number",
              example: 1,
            },
          },
        },
        Admin: {
          type: "object",
          properties: {
            id: {
              type: "number",
              example: 1,
            },
            name: {
              type: "string",
              example: "Admin User",
            },
            email_address: {
              type: "string",
              example: "admin@streaminglive.com",
            },
            role: {
              type: "string",
              example: "admin",
            },
            status: {
              type: "number",
              example: 1,
            },
          },
        },
        MembershipPlan: {
          type: "object",
          properties: {
            id: {
              type: "number",
              example: 1,
            },
            name: {
              type: "string",
              example: "Premium Plan",
            },
            type: {
              type: "string",
              enum: ["trial", "regular", "premium"],
              example: "premium",
            },
            price: {
              type: "number",
              example: 29.99,
            },
            durationDays: {
              type: "number",
              nullable: true,
              example: 30,
            },
            creditsDiscount: {
              type: "number",
              example: 10,
            },
            isActive: {
              type: "boolean",
              example: true,
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Admin Panel - Authentication",
        description: "Admin authentication and profile management",
      },
      {
        name: "Admin Panel - User Management",
        description: "Manage users (create, update, delete, status)",
      },
      {
        name: "Admin Panel - Streamer Management",
        description: "Manage streamers (create, update, delete, verify)",
      },
      {
        name: "Admin Panel - Membership Plans",
        description: "Manage membership plans and pricing",
      },
      {
        name: "Admin Panel - CMS",
        description: "Content management system (pages, about us)",
      },
      {
        name: "Admin Panel - Email Templates",
        description: "Manage email templates",
      },
      {
        name: "Admin Panel - FAQ",
        description: "Manage frequently asked questions",
      },
      {
        name: "Admin Panel - Security",
        description: "Security and monitoring endpoints",
      },
      {
        name: "User - Authentication",
        description:
          "User authentication, registration, and password management",
      },
      {
        name: "User - Profile",
        description: "User profile management",
      },
      {
        name: "Health",
        description: "Health check endpoints",
      },
    ],
  },
  apis: [
    // Scan admin routes
    path.join(appRoot.path, "src", "routes", "admin", "**", "*.ts"),
    // Scan user routes for authentication endpoints
    path.join(appRoot.path, "src", "routes", "user", "auth.route.ts"),
    path.join(appRoot.path, "src", "routes", "index.ts"), // Health check routes
    path.join(appRoot.path, "dist", "routes", "admin", "**", "*.js"), // For compiled JavaScript
    path.join(appRoot.path, "dist", "routes", "user", "auth.route.js"), // For compiled JavaScript
    path.join(appRoot.path, "dist", "routes", "index.js"), // Health check routes
  ],
};

let swaggerSpec: any;

try {
  swaggerSpec = swaggerJsdoc(options);

  // Log if spec was generated successfully
  if (swaggerSpec && swaggerSpec.paths) {
    console.log(
      `Swagger documentation loaded successfully. Found ${
        Object.keys(swaggerSpec.paths).length
      } endpoints.`
    );
  } else {
    console.warn(
      "Swagger spec generated but no paths found. Check if route files have Swagger comments."
    );
  }
} catch (error) {
  console.error("Error generating Swagger documentation:", error);
  // Return a minimal spec to prevent app crash
  swaggerSpec = {
    openapi: "3.0.0",
    info: {
      title: "streaming LIVE API Documentation",
      version: "1.0.0",
      description: "Error loading documentation. Please check server logs.",
    },
    paths: {},
  };
}

export default swaggerSpec;
