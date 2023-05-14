interface Endpoint {
    url: string;
    description: string;
    request: {
        [ method: string ]: {
            headers: RequestObject[];
            body?: RequestObject[];
        }
    },
    response: {
        [ name: string ]: ResponseObject;
    }
}

interface RequestObject {
    required: boolean;
    type: "string" | "number" | "boolean";
    name: string;
    description: string;
}

interface ResponseObject {
    type: "string" | "number" | "boolean";
    description: string;
}

export const endpoints: Endpoint[] = [
    {
        url: "/",
        description: "General API information",
        request: {
            "GET": { headers: [] }
        },
        response: {}
    },
    {
        url: "/login",
        description: "Log into Schulportal using name and password",
        request: {
            "POST": {
                headers: [],
                body: [
                    { required: true, type: "string", name: "username", description: "Username like vorname.nachname" },
                    { required: true, type: "string", name: "password", description: "Password of user" },
                    { required: true, type: "number", name: "id", description: "ID of school" },
                ]
            }
        },
        response: {
            token: {
                type: "string",
                description: "Token usable for all other authenticated endpoints"
            }
        }
    },
    {
        url: "/check",
        description: "Check if a provided auth token is valid",
        request: {
            "POST": {
                headers: [],
                body: [
                    { required: true, type: "string", name: "token", description: "Auth token created by /login" },
                ]
            }
        },
        response: {
            valid: {
                type: "boolean",
                description: "Whether the given token is valid or not"
            }
        }
    },
]