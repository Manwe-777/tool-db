import { validateNewTransaction } from "./chain/Tx";

import express from "express";
import bodyParser from "body-parser";

import ToolChain from "./chain/ToolChain";

export interface ToolChainServerOptions {
  port: number;
}

function routes(app: express.Express, toolChain: ToolChain) {
  app.get("/mempool", (req, res) => {
    res.status(200).json(toolChain.mempool);
  });

  app.post("/tx", (req, res) => {
    if (req.body) {
      if (validateNewTransaction(req.body, toolChain)) {
        toolChain.mempool[req.body.id] = req.body;
        res.status(200).json({ message: "ok" });
      } else {
        res.status(400).json({ message: "Invalid transaction" });
      }
    }
  });

  app.get("/get/:key", (req, res) => {
    if (req.params.key) {
      if (toolChain.datas[req.params.key]) {
        res.status(200).json(toolChain.datas[req.params.key]);
      } else {
        res.status(404).json({ message: "Not found" });
      }
    } else {
      res.status(400).json({ message: "Missing key" });
    }
  });
}

export default class ToolChainServer {
  private _port: number = 9999;

  public toolChain = new ToolChain(true);

  constructor(options: Partial<ToolChainServerOptions>) {
    if (options.port) {
      this._port = options.port;
    }

    const app = express();
    app.use(bodyParser);
    app.use(express.json());
    routes(app, this.toolChain);
    app.listen(this._port, () => {
      console.log("listening on port " + this._port);
    });
  }
}
