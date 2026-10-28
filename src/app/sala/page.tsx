import { RoomApp } from "../_components/room/RoomApp";
import { AsciiHorizon } from "../_components/ui/AsciiHorizon";

/** `/sala`: a sala em que a pessoa está, reconhecida pelo cookie de membro (RNE002). */
export default function RoomPage() {
    // o quadro da entrada: o horizonte do rodapé, feito no servidor (o WebGL baixa sob demanda)
    return <RoomApp art={<AsciiHorizon className="absolute inset-0" />} />;
}
