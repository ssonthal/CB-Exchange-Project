import express from "express";
import { userRoute } from "./routes/user";
import { orderRoute } from "./routes/order";
import { authMiddleware } from "./middleware/mdw";

const app:any = express();

app.use(authMiddleware);
app.use("/api/user", userRoute);
app.use("/api/order", orderRoute);




const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});