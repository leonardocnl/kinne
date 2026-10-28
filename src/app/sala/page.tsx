import { RoomApp } from "../_components/room/RoomApp";
import { ProjectorBeam } from "../_components/ui/ProjectorBeam";

/** `/sala`: a sala em que a pessoa está, reconhecida pelo cookie de membro (RNE002). */
export default function RoomPage() {
    // o quadro da entrada: o feixe de projetor, só CSS, do servidor
    return <RoomApp art={<ProjectorBeam className="absolute inset-0" />} />;
}
