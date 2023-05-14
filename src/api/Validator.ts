// store multiple checks for objects for one request (like array or sth)
// pile all errors (if any) into an array and return so it can be send to user
// error would look like this to user:
/**
 * {
 *  error: true,
 *  message: "400: Bad Request"
 *  details: [
 *    "username is required",
 *    "id must be of type number",
 *    "password must be of type string"
 *  ], schema: {
 *  
 * }
 * }
 */
// it is important to also show a schema to the user if needed
// Validator (old: ErrorGenerator) should be able to do all these tasks
// should be a class with multiple functions, ie adding a check to it
// or function to return all the results of the checks

class Validator {

    constructor(method: HTTPMethod) {

    }

    private results: ValidatorCheck[] = [];
    
    public addCheck(type: ValidatorCheckType, variable: any, name: string, dataType?: JSType): number {
        let result = "";
        if (type === "IS_TYPE") 
            if (typeof variable !== dataType) 
                result = name + " is not of type " + dataType;
        if (type === "IS_DEFINED")
            if (variable === undefined || variable === null)
                result = name + "is required";

        if (result !== "") 
            return this.results.push({ type: type, variable: variable, results: result });
        else
            return -1;
    }

    public getResults(): ValidatorCheck[] {
        return this.results;
    }

}

interface ValidatorResults {
    error: boolean;
    error_details: ValidatorCheck[];
}

interface ValidatorCheck {
    type: ValidatorCheckType;
    variable: any;
    results: string;
}

type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ValidatorCheckType = "IS_DEFINED" | "IS_TYPE";
type JSType = "string" | "number" | "object" | "boolean";