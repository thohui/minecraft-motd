import { randomUUID } from "node:crypto";
import { createServer, Server, Socket } from "node:net";
import { ReadBuffer, WriteBuffer } from "./buffer";

export class MinecraftServer {
  private status: StatusResponse;
  private nodeServer: Server;

  public constructor(motd: string, favicon?: string) {
    this.status = {
      version: {
        name: "1.19",
        protocol: 760,
      },
      description: {
        text: motd,
      },
      players: {
        online: 1,
        max: 999,
        sample: [
          {
            id: randomUUID(),
            name: "Notch",
          },
        ],
      },
      previewsChat: false,
      enforcesSecureChat: false,
    };
    this.nodeServer = createServer(this.handleIncomingConnection());
  }
  public start(port = 25565) {
    this.nodeServer.listen(port, () => {
      console.log("Listening on port", port);
    });
  }
  private handleIncomingConnection() {
    return (socket: Socket) => {
      socket.on("error", (err) => {});

      socket.on("data", (data: Buffer) => {
        const readBuffer = new ReadBuffer(data);
        const packetLength = readBuffer.readVarInt();
        const packetId = readBuffer.readVarInt();
        switch (packetId) {
          case 0x00: // https://wiki.vg/Protocol#Handshake
            if (packetLength > 1) {
              const version = readBuffer.readVarInt();
              const addr = readBuffer.readString(255);
              const port = readBuffer.readShort(true);
              const nextState = readBuffer.readVarInt();
              if (nextState === 1) {
                const content = new WriteBuffer();
                content.writeVarInt(0x00);
                content.writeString(JSON.stringify(this.status));
                const writer = new WriteBuffer();
                writer.writeVarInt(content.toBuffer().length);
                writer.appendBuffer(content.toBuffer());
                socket.write(writer.toBuffer());
                break;
              }
            }
          case 0x01: // https://wiki.vg/Protocol#Ping_Response
            socket.write(data);
            break;
        }
      });
    };
  }
}
export interface StatusResponse {
  version: {
    name: string;
    protocol: number;
  };
  players: {
    max: number;
    online: number;
    sample: PlayerSample[];
  };
  description: {
    text: string;
  };
  favicon?: string;
  previewsChat: boolean;
  enforcesSecureChat: boolean;
}

export interface PlayerSample {
  id: string;
  name: string;
}
