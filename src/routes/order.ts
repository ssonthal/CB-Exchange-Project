import express, {Request, Response}  from "express";
import {User, users, OwnedAssets} from "./user";

export const orderRoute:any = express.Router();
orderRoute.use(express.json());

enum Side {
    Buy, 
    Sell
}

interface Stakeholder {
    customer_id : number, 
    qty: number,
    price: number,
    createdAt: Date
}

interface Order {
    id: number, 
    type: Side, 
    price: number,
    qty: number,
    stakeholders: Map<string, Stakeholder>
}


let order_books:{[key: string] : Order[]} = {
    "tata" : 
    [
        {
            id: 1, 
            type: Side.Sell,
            price: 1000,
            qty: 7,
            stakeholders: new Map()
        }, 
        {
            id: 2, 
            type: Side.Sell,
            price: 999,
            qty: 12, 
            stakeholders: new Map()
        }, 
        {
            id: 3, 
            type: Side.Sell,
            price: 998,
            qty: 21, 
            stakeholders: new Map()
        }, 
        {
            id: 4, 
            type: Side.Sell,
            price: 997,
            qty: 100, 
            stakeholders: new Map()
        }, 
        {
            id: 5, 
            type: Side.Buy,
            price: 995,
            qty: 7, 
            stakeholders: new Map()
        }, 
        {
            id: 6, 
            type: Side.Buy,
            price: 994,
            qty: 12,
            stakeholders: new Map()
        }, 
        {
            id: 7 , 
            type: Side.Buy,
            price: 993,
            qty: 21,
            stakeholders: new Map()
        }, 
        {
            id: 8, 
            type: Side.Buy,
            price: 992,
            qty: 100,
            stakeholders: new Map()
        }
    ],  
};


// zod validation

orderRoute.post("/", (req:Request, res:Response) => {
    // if no limit present in property
    
    if (req.body.ticker in order_books)
    {
        if (!req.body.limit) 
        {
            const order_book = order_books.ticker;
            // Case 1: Market Order & Buy
            if(req.body.type == Side.Buy)
            {
                return handleMarketBuyOrders(req, res, order_book);
            }
            else if (req.body.type == Side.Sell){
                return handleMarketSellOrders(req, res, order_book);
            }
        }
        else{
            const order_book = order_books.ticker;
            if(req.body.type == Side.Buy)
            {
                return handleLimitBuyOrders(req, res, order_book);
            }
            else if (req.body.type == Side.Sell){
                return handleLimitSellOrders(req, res, order_book);
            }
        }
    }
    else
    {
        return res.status(403).json({msg: "Couldn't find the requested stock ticker!!!"});
    }
});

function handleMarketBuyOrders(req:Request, res: Response, order_book:Order[])
   {
                const buyer:User = req.userDetail;
                const sellOrders:Order[] = order_book.filter((order) => {order.type == Side.Sell});
                const buyQty = req.body.qty;
                const ticker = req.body.ticker;
                let allSellers:Stakeholder[] = [];
                let avg_price = 0;
                let ordersToBeRemoved = [];
                if(sellOrders.length > 0){
                    sellOrders.sort((o1, o2) => o2.price - o1.price);
                    var remaining_qty = buyQty;
                    while (remaining_qty > 0) {
                        for(let i = 0; i < sellOrders.length; i++) {
                            if (buyer.balance >= sellOrders[i].price*buyQty)
                            {
                                if (sellOrders[i].qty > buyQty)
                                {
                                    let {order, stakeholders} = getValidStakeholdersFromSellOrder(sellOrders[i], remaining_qty);
                                    sellOrders[i] = order;
                                    allSellers.concat(stakeholders);
                                    remaining_qty = 0; 
                                    break; 
                                }
                                else {
                                    remaining_qty -= sellOrders[i].qty;
                                    for (const [customer_id, stakeholder] of sellOrders[i].stakeholders) {
                                        allSellers.push(stakeholder);
                                    }
                                    ordersToBeRemoved.push(sellOrders[i].id);
                                }
                            }
                            else {
                                return res.status(403).json({msg: "Insufficient wallet balance"});
                            }
                        }
                    }
                    let totalPrice = 0; 
                    for (let j = 0; j < allSellers.length; j++){
                        let seller = users.get(allSellers[j].customer_id.toString());
                        if(seller) {
                            totalPrice += allSellers[j].price;
                            updateUserBalanceAndAssets(seller, allSellers[j].price, allSellers[j].qty, ticker, Side.Sell);
                        }
                    }
                    let avgPrice = totalPrice/allSellers.length;
                    updateUserBalanceAndAssets(buyer, avgPrice, buyQty, ticker, Side.Buy);
                }
                else {
                    return res.status(500).json({msg: "Fatal Error: no sell orders available."});
                }
            } 


function updateUserBalanceAndAssets(user:User, price:number, qty: number, ticker: string, side: Side)
{
    if(side == Side.Buy) {
        user.balance -= price*qty;
        if (ticker in user.assets)
        {
            const ownedAssets:any = user.assets.get(ticker);
            ownedAssets.qty += qty;
            user.assets.set(ticker, ownedAssets);
        }
        else
        {
            user.assets.set(ticker, {qty : qty, avg_price: price});
        }
    }
    else {
        user.balance += price*qty;
        const ownedAssets:any = user.assets.get(ticker);
        ownedAssets.qty -= qty;
        if(ownedAssets.qty > 0) {
            user.assets.set(ticker, ownedAssets);
        }
        else 
        {
            user.assets.delete(ticker);
        } 
    }
    users.set(user.customer_id.toString(), user);   
}

function getValidStakeholdersFromSellOrder(order: Order, qty: number) {
    
    let stakeholders:Stakeholder[] = [];
    
    order.stakeholders = sortStakeholdersBasedOnOrderCreatedTime(order);

    let excessQtyStakeholderId = ""; 
    for (const [customer_id, stakeholder] of order.stakeholders) {
        if (qty - stakeholder.qty >= 0) {
            qty -= stakeholder.qty;
            stakeholders.push(stakeholder);
        }
        else{
            // there is a chance that qty == 0 when the control reaches here.
            // in that case, we can simply break the loop.
            if(qty > 0){
                excessQtyStakeholderId = customer_id;
            }
            break;
        }
    }

    if(excessQtyStakeholderId) {
        //update stakeholder's qty. don't delete.
        let excessQtyStakeholder:any = order.stakeholders.get(excessQtyStakeholderId);
        excessQtyStakeholder.qty -= qty;
        
        order.stakeholders.set(excessQtyStakeholderId, excessQtyStakeholder);
        excessQtyStakeholder.qty = qty;
        stakeholders.push(excessQtyStakeholder);
        qty = 0;
    }
    return {order, stakeholders};
}

function sortStakeholdersBasedOnOrderCreatedTime(order:Order){
    const stakeholderMapArray = Array.from(order.stakeholders);
    const sorted = stakeholderMapArray.sort((a, b) => {
        return a[1].createdAt.getTime() - b[1].createdAt.getTime();
    });
    return new Map<string, Stakeholder>(sorted);
}

function clearSellOrder(req:Request, res:Response, buyer:User, sellOrder:Order, buyQty: number, ticker: string) : Order{
    let {order, stakeholders} = getValidStakeholdersFromSellOrder(sellOrder, buyQty);
    sellOrder = order;
    //update buyer balance
    updateUserBalanceAndAssets(buyer, sellOrder.price, sellOrder.qty, ticker, Side.Buy);
    for (let j = 0; j < stakeholders.length; j++){
        let seller = users.get(stakeholders[j].customer_id.toString());
        if(seller){
            //update seller balance one-by-one
            updateUserBalanceAndAssets(seller, order.price, stakeholders[j].qty, ticker, Side.Sell);
        }
    }
    return sellOrder;
}


function handleMarketSellOrders(req:Request, res: Response, order_book: Order[]) {

}
function handleLimitBuyOrders(req:Request, res: Response, order_book: Order[]) {

    // 1. if any matching sell limit order or an order with lower price found => place market orders at the price for the sell order's quantity
    const buyer:User = req.userDetail;
    const sellOrders:Order[] = order_book.filter((order) => {order.type == Side.Sell});
    const buyQty = req.body.qty;
    const ticker = req.body.ticker;
    const askPrice = req.body.price;
    if(sellOrders.length > 0){
        sellOrders.sort((o1, o2) => o2.price - o1.price);
        if (sellOrders[0].price > askPrice) {
            // check if any buy order at the same price is available. 
            const buyOrders:Order[] = order_book.filter((order) => {order.type == Side.Buy});
            let availableOrder = buyOrders.find((order) => {order.price == askPrice});
            if (availableOrder) {            
                if(availableOrder.stakeholders.has(buyer.customer_id.toString()))
                {
                    let stakeholder:any = availableOrder.stakeholders.get(buyer.customer_id.toString());
                    stakeholder.qty += buyQty; 
                    availableOrder.stakeholders.set(buyer.customer_id.toString(), stakeholder);
                }
                else {
                    availableOrder.stakeholders.set(buyer.customer_id.toString(), { customer_id : buyer.customer_id, qty: buyQty, price: askPrice, createdAt: new Date()});
                }
            }
            else {
                let stakeholder = new Map<string, Stakeholder>();
                stakeholder.set(buyer.customer_id.toString(), { customer_id : buyer.customer_id, qty: buyQty, price: askPrice, createdAt: new Date()});
                let order: Order = {
                    id: sellOrders.length + 1, 
                    price: askPrice, 
                    qty: buyQty,
                    type: Side.Buy,
                    stakeholders: stakeholder
                }
                order_book.push(order);
            }
        }
        else{
            // there are sell orders at lower price than the buy limit order. which means some sell orders can be eaten up. 
            let remaining_qty:number = buyQty; 
            for(let i = 0; i < sellOrders.length && remaining_qty > 0 && sellOrders[i].price < askPrice; i++) {
                let {unsoldQty, allSellers, ordersToBeRemoved} = processSellOrder(sellOrders[i], remaining_qty, buyer);
                remaining_qty = unsoldQty;   
                for (let j = 0; j < allSellers.length; j++){
                    let seller = users.get(allSellers[j].customer_id.toString());
                    if(seller) {
                        updateUserBalanceAndAssets(seller, allSellers[j].price, allSellers[j].qty, ticker, Side.Sell);
                    }
                }
                updateUserBalanceAndAssets(buyer, sellOrders[i].price, sellOrders[i].qty, ticker, Side.Buy);
                if(ordersToBeRemoved && ordersToBeRemoved.length > 0){
                    ordersToBeRemoved.map((orderId) => {
                        order_book.splice(orderId);
                    });
                }  
            }
            // sell order's qty wasn't sufficient to cut off the buy order. so creating new buy limit order in order book.
            if (remaining_qty > 0) {
                let stakeholder = new Map<string, Stakeholder>();
                stakeholder.set(buyer.customer_id.toString(), { customer_id : buyer.customer_id, qty: remaining_qty, price: askPrice, createdAt: new Date()});
                let order: Order = {
                    id: sellOrders.length + 1, 
                    price: askPrice, 
                    qty: remaining_qty,
                    type: Side.Buy,
                    stakeholders: stakeholder
                }
                order_book.push(order);
            }
        }
    }


    // 2. if the qty != 0 => add a new limit order in the order book with remaining qty.
    // 3. step 2 to be done if step 1 condition is false
}

function handleLimitSellOrders(req:Request, res: Response, order_book: Order[]) {
    // 1. if any matching buy order found with price equal or greater => place market sell orders at the price for the buy order's qty. 
    // 2. if the qty != 0 => add a new sell limit order in the order book with remaining qty. 
    // 3. step 2 to be done if step 1 condition is false
}

function processSellOrder(sellOrder:Order, buyQty: number, buyer:User) {
    let unsoldQty:number = buyQty;
    let allSellers:Stakeholder[] = [];
    let ordersToBeRemoved:number[] = [];
    if (buyer.balance >= sellOrder.price*buyQty)
    {
        if (sellOrder.qty > buyQty)
        {
            let {order, stakeholders} = getValidStakeholdersFromSellOrder(sellOrder, unsoldQty);
            sellOrder = order;
            allSellers.concat(stakeholders);
        }
        else {
            unsoldQty -= sellOrder.qty;
            for (const [customer_id, stakeholder] of sellOrder.stakeholders) {
                allSellers.push(stakeholder);
            }
            ordersToBeRemoved.push(sellOrder.id);
        }
    }
    return {unsoldQty, allSellers, ordersToBeRemoved};
}