import http from "k6/http";
import { sleep } from "k6";

export let options = {
  vus: 25000, // virtual users
  duration: "10s", // duration of the test
};

export default function () {
  let res = http.get("http://localhost:8080/quotes/random");

  // Log the response body to the console
  console.log("Response body: " + res.body);

  // Optional: Log the status code to the console
  console.log("Status code: " + res.status);

  // Sleep for 1 second between requests
  sleep(1);
}
